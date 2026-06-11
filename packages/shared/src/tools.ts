export const AVAILABLE_TOOLS = [
  'read_file',
  'write_file',
  'shell',
  'run_tests',
  'open_draft_pr',
] as const;

export type ToolName = (typeof AVAILABLE_TOOLS)[number];

export function isToolName(value: string): value is ToolName {
  return (AVAILABLE_TOOLS as readonly string[]).includes(value);
}
