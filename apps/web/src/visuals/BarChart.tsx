export interface BarChartItem {
  label: string;
  value: number;
  tone?: 'ok' | 'warn' | 'danger' | 'default';
}

interface BarChartProps {
  items: BarChartItem[];
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}

export function BarChart({
  items,
  valueFormatter = (value) => value.toLocaleString(),
  emptyLabel = '暂无数据',
}: BarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0 || items.every((item) => item.value === 0)) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label="横向柱状图">
      {items.map((item) => {
        const width = Math.max(4, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="bar-chart-row">
            <span className="bar-chart-label">{item.label}</span>
            <div className="bar-chart-track">
              <div
                className={`bar-chart-fill bar-chart-${item.tone ?? 'default'}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="bar-chart-value">{valueFormatter(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
