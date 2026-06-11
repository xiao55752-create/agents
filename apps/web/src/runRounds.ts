import type { Run, RunOutputSnapshot } from './types';

export type { RunOutputSnapshot };

export interface FileListDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export function snapshotFromOutput(
  run: Run,
  trigger: 'revise' | 'reject',
): RunOutputSnapshot | null {
  if (!run.output) return null;
  return {
    attempt: run.output.attempt ?? run.runAttempt ?? 1,
    summary: run.output.summary,
    changedFiles: run.output.changedFiles ? [...run.output.changedFiles] : undefined,
    revisionApplied: run.output.revisionApplied,
    branch: run.output.branch,
    savedAt: new Date().toISOString(),
    trigger,
  };
}

export function appendOutputHistory(run: Run, trigger: 'revise' | 'reject'): RunOutputSnapshot[] {
  const snap = snapshotFromOutput(run, trigger);
  if (!snap) return run.outputHistory ?? [];
  return [...(run.outputHistory ?? []), snap];
}

export function latestSnapshot(run: Run): RunOutputSnapshot | undefined {
  const history = run.outputHistory ?? [];
  return history.length > 0 ? history[history.length - 1] : undefined;
}

export function compareFileLists(prev: string[] = [], curr: string[] = []): FileListDiff {
  const prevSet = new Set(prev);
  const currSet = new Set(curr);
  return {
    added: curr.filter((f) => !prevSet.has(f)),
    removed: prev.filter((f) => !currSet.has(f)),
    unchanged: curr.filter((f) => prevSet.has(f)),
  };
}

export function hasRoundComparison(run: Run): boolean {
  return Boolean(latestSnapshot(run) && run.output);
}
