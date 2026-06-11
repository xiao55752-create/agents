import type { AgentSpec, RunInput } from '@agentos/shared';
import { getAnthropicApiKey } from './config.js';

export interface LlmPlanStep {
  tool: string;
  message: string;
}

export interface LlmRunResult {
  summary: string;
  steps: LlmPlanStep[];
  tokensUsed: number;
  rawText: string;
}

function buildUserPrompt(input: RunInput): string {
  return [
    `Repository: ${input.repo}`,
    input.issueNumber ? `Issue #${input.issueNumber}` : null,
    input.issueTitle ? `Title: ${input.issueTitle}` : null,
    input.issueBody ? `Body:\n${input.issueBody}` : null,
    '',
    'Produce a fix plan for this issue. Respond in JSON only:',
    '{',
    '  "summary": "one line PR summary",',
    '  "steps": [',
    '    { "tool": "read_file", "message": "what you read" },',
    '    { "tool": "write_file", "message": "what you change" },',
    '    { "tool": "run_tests", "message": "test result" }',
    '  ]',
    '}',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseLlmJson(text: string): { summary: string; steps: LlmPlanStep[] } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM response did not contain JSON');
  const parsed = JSON.parse(match[0]) as {
    summary?: string;
    steps?: LlmPlanStep[];
  };
  if (!parsed.summary || !Array.isArray(parsed.steps)) {
    throw new Error('LLM JSON missing summary or steps');
  }
  return {
    summary: parsed.summary,
    steps: parsed.steps.map((s) => ({
      tool: String(s.tool ?? 'read_file'),
      message: String(s.message ?? ''),
    })),
  };
}

export async function runLlmPlan(
  agent: AgentSpec,
  input: RunInput,
): Promise<LlmRunResult> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = agent.model.startsWith('claude') ? agent.model : 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(agent.limits.maxTokens, 4096),
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const rawText = data.content?.find((c) => c.type === 'text')?.text ?? '';
  const { summary, steps } = parseLlmJson(rawText);
  const tokensUsed =
    (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

  return { summary, steps, tokensUsed, rawText };
}
