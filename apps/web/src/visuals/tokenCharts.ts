import type { Run } from '../types';

export function buildTokenTrendSeries(runs: Run[]): { points: number[]; labels: string[] } {
  const withTokens = runs.filter((run) => run.tokensUsed > 0);
  if (withTokens.length === 0) return { points: [], labels: [] };

  const byDay = new Map<string, number>();
  for (const run of withTokens) {
    const day = run.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + run.tokensUsed);
  }

  const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  return {
    points: sorted.map(([, value]) => value),
    labels: sorted.map(([day]) => day.slice(5)),
  };
}

export function buildRunTokenBars(runs: Run[], limit = 5): Array<{ label: string; value: number }> {
  return [...runs]
    .filter((run) => run.tokensUsed > 0)
    .sort((a, b) => b.tokensUsed - a.tokensUsed)
    .slice(0, limit)
    .map((run, index) => ({
      label: `#${index + 1}`,
      value: run.tokensUsed,
    }));
}
