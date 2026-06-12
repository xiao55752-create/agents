interface SparklineChartProps {
  points: number[];
  labels?: string[];
  emptyLabel?: string;
}

export function SparklineChart({
  points,
  labels,
  emptyLabel = '暂无趋势数据',
}: SparklineChartProps) {
  if (points.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  const width = 320;
  const height = 96;
  const padX = 8;
  const padY = 10;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((value, index) => {
    const x = padX + index * step;
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value };
  });

  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x} ${height - padY} L ${coords[0]!.x} ${height - padY} Z`;

  return (
    <div className="sparkline-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" role="img" aria-label="Token 消耗趋势">
        <defs>
          <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(var(--accent-rgb), 0.35)" />
            <stop offset="100%" stopColor="rgba(var(--accent-rgb), 0)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-fill)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="var(--accent)" />
        ))}
      </svg>
      {labels && labels.length > 0 && (
        <div className="sparkline-labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
