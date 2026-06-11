import { compareFileLists, latestSnapshot } from './runRounds';
import type { Run } from './types';

interface RoundCompareProps {
  run: Run;
  compact?: boolean;
}

export function RoundCompare({ run, compact = false }: RoundCompareProps) {
  const previous = latestSnapshot(run);
  const current = run.output;
  if (!previous || !current) return null;

  const prevAttempt = previous.attempt;
  const currAttempt = current.attempt ?? run.runAttempt ?? prevAttempt + 1;
  const fileDiff = compareFileLists(previous.changedFiles, current.changedFiles);

  const summaryChanged = (previous.summary ?? '').trim() !== (current.summary ?? '').trim();

  return (
    <section className={`round-compare${compact ? ' round-compare-compact' : ''}`}>
      <div className="round-compare-head">
        <span className="section-kicker">轮次对比</span>
        <h3>
          第 {prevAttempt} 轮 → 第 {currAttempt} 轮
        </h3>
        {previous.trigger && (
          <p className="round-compare-trigger">
            触发原因：{previous.trigger === 'revise' ? '要求修改' : '打回重做'}
            {previous.revisionApplied ? ` · ${previous.revisionApplied}` : ''}
          </p>
        )}
      </div>

      {summaryChanged ? (
        <div className="round-compare-block">
          <strong>PR 摘要变化</strong>
          <div className="round-compare-columns">
            <div className="round-compare-col round-compare-prev">
              <span className="round-compare-label">上一轮</span>
              <p>{previous.summary ?? '（无摘要）'}</p>
            </div>
            <div className="round-compare-col round-compare-curr">
              <span className="round-compare-label">当前轮</span>
              <p>{current.summary ?? '（无摘要）'}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="round-compare-unchanged">PR 摘要与上一轮相同</p>
      )}

      <div className="round-compare-block">
        <strong>变更文件对比</strong>
        <ul className="round-compare-files">
          {fileDiff.added.map((f) => (
            <li key={`add-${f}`} className="round-file-added">
              <span className="round-file-tag">新增</span>
              <code>{f}</code>
            </li>
          ))}
          {fileDiff.removed.map((f) => (
            <li key={`rm-${f}`} className="round-file-removed">
              <span className="round-file-tag">移除</span>
              <code>{f}</code>
            </li>
          ))}
          {fileDiff.unchanged.map((f) => (
            <li key={`keep-${f}`} className="round-file-unchanged">
              <span className="round-file-tag">保留</span>
              <code>{f}</code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
