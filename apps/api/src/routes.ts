import type { FastifyInstance } from 'fastify';
import { BUILTIN_SKILLS, computePlatformMetrics, validateAgentSpec } from '@agentos/shared';
import {
  createAgent,
  createRun,
  getAgent,
  getAudit,
  getLogs,
  getRun,
  listAgents,
  listRuns,
  setControlIntent,
  updateAgent,
} from './db.js';
import { getIntegrations } from './config.js';
import { enqueueReconcile } from './reconcile.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    ok: true,
    service: 'agentos-api',
    version: '0.2.0-mvp',
    integrations: getIntegrations(),
  }));

  app.get('/api/config', async () => ({
    integrations: getIntegrations(),
  }));

  app.get('/api/skills', async () => ({
    skills: BUILTIN_SKILLS.map((s) => ({ ...s, tools: [...s.tools] })),
  }));

  app.get('/api/metrics', async () => ({
    metrics: computePlatformMetrics(listRuns()),
  }));

  app.post('/api/webhooks/github', async (req, reply) => {
    return reply.code(202).send({
      ok: true,
      message: 'Webhook received (stub). Wire GitHub App in P2.',
      payload: req.body ?? null,
    });
  });

  app.get('/api/agents', async () => ({ agents: listAgents() }));

  app.get<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    const agent = getAgent(req.params.id);
    if (!agent) return reply.code(404).send({ error: { code: 'not_found', message: 'Agent not found' } });
    return { agent };
  });

  app.post<{
    Body: {
      name?: string;
      spec?: {
        name?: string;
        model?: string;
        systemPrompt?: string;
        skills?: string[];
        tools?: string[];
        limits?: { maxTokens?: number; timeoutMinutes?: number; maxRetries?: number };
      };
    };
  }>('/api/agents', async (req, reply) => {
    const validated = validateAgentSpec({
      name: req.body.name ?? req.body.spec?.name,
      model: req.body.spec?.model,
      systemPrompt: req.body.spec?.systemPrompt,
      skills: req.body.spec?.skills,
      tools: req.body.spec?.tools,
      limits: req.body.spec?.limits,
    });
    if (!validated.ok) {
      return reply.code(400).send({ error: { code: 'invalid_spec', message: validated.error } });
    }

    const agent = createAgent(validated.spec.name, validated.spec);
    return reply.code(201).send({ agent });
  });

  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      spec?: {
        name?: string;
        model?: string;
        systemPrompt?: string;
        skills?: string[];
        tools?: string[];
        limits?: { maxTokens?: number; timeoutMinutes?: number; maxRetries?: number };
      };
    };
  }>('/api/agents/:id', async (req, reply) => {
    const existing = getAgent(req.params.id);
    if (!existing) return reply.code(404).send({ error: { code: 'not_found', message: 'Agent not found' } });

    const validated = validateAgentSpec({
      name: req.body.name ?? req.body.spec?.name ?? existing.name,
      model: req.body.spec?.model ?? existing.spec.model,
      systemPrompt: req.body.spec?.systemPrompt ?? existing.spec.systemPrompt,
      skills: req.body.spec?.skills ?? existing.spec.skills,
      tools: req.body.spec?.tools ?? existing.spec.tools,
      limits: {
        maxTokens: req.body.spec?.limits?.maxTokens ?? existing.spec.limits.maxTokens,
        timeoutMinutes: req.body.spec?.limits?.timeoutMinutes ?? existing.spec.limits.timeoutMinutes,
        maxRetries: req.body.spec?.limits?.maxRetries ?? existing.spec.limits.maxRetries,
      },
    });
    if (!validated.ok) {
      return reply.code(400).send({ error: { code: 'invalid_spec', message: validated.error } });
    }

    const agent = updateAgent(req.params.id, {
      name: req.body.name ?? validated.spec.name,
      spec: validated.spec,
    });
    return { agent };
  });

  app.get<{ Querystring: { status?: string } }>('/api/runs', async (req) => ({
    runs: listRuns(req.query.status),
  }));

  app.get<{ Params: { id: string } }>('/api/runs/:id', async (req, reply) => {
    const run = getRun(req.params.id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    return { run };
  });

  app.post<{
    Body: {
      agentId?: string;
      workflow?: string;
      input: { repo: string; issueNumber?: number; issueTitle?: string; issueBody?: string };
    };
  }>('/api/runs', async (req, reply) => {
    const agents = listAgents();
    const agentId = req.body.agentId ?? agents[0]?.id;
    if (!agentId) {
      return reply.code(400).send({ error: { code: 'no_agent', message: 'No agent configured' } });
    }
    if (!req.body.input?.repo) {
      return reply.code(400).send({ error: { code: 'invalid_input', message: 'input.repo is required' } });
    }

    const run = createRun({
      agentId,
      workflow: req.body.workflow ?? 'issue-to-pr',
      input: req.body.input,
    });
    enqueueReconcile(run.id);
    return reply.code(201).send({ run });
  });

  app.post<{ Params: { id: string } }>('/api/runs/:id/cancel', async (req, reply) => {
    const run = getRun(req.params.id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    setControlIntent(run.id, 'cancel');
    enqueueReconcile(run.id);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/runs/:id/approve', async (req, reply) => {
    const run = getRun(req.params.id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    setControlIntent(run.id, 'approve');
    enqueueReconcile(run.id);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/runs/:id/retry', async (req, reply) => {
    const run = getRun(req.params.id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    setControlIntent(run.id, 'retry');
    enqueueReconcile(run.id);
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/runs/:id/audit', async (req, reply) => {
    const run = getRun(req.params.id);
    if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });
    const events = getAudit(req.params.id).map((e: { id: number; eventType: string; payload: Record<string, unknown>; createdAt: string }) => ({
      id: e.id,
      type: e.eventType,
      payload: e.payload,
      createdAt: e.createdAt,
    }));
    return { events };
  });

  app.get<{ Params: { id: string }; Querystring: { after?: string } }>(
    '/api/runs/:id/logs',
    async (req, reply) => {
      const run = getRun(req.params.id);
      if (!run) return reply.code(404).send({ error: { code: 'not_found', message: 'Run not found' } });

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      let afterId = Number(req.query.after ?? 0);

      const send = () => {
        const logs = getLogs(req.params.id, afterId);
        for (const log of logs) {
          afterId = log.id;
          reply.raw.write(
            `event: log\ndata: ${JSON.stringify({
              id: log.id,
              level: log.level,
              message: log.message,
              meta: log.meta ?? null,
              ts: log.createdAt,
            })}\n\n`,
          );
        }
      };

      send();
      const timer = setInterval(send, 1000);

      req.raw.on('close', () => {
        clearInterval(timer);
      });
    },
  );
}
