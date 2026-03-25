interface TrendDatum {
  label: string;
  income: number;
  expense: number;
}

interface SimpleTrendChartProps {
  data: TrendDatum[];
}

function buildPath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default function SimpleTrendChart({ data }: SimpleTrendChartProps) {
  const width = 560;
  const height = 220;
  const incomeValues = data.map((item) => item.income);
  const expenseValues = data.map((item) => item.expense);

  return (
    <div className="trend-wrapper">
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Income and expense trend chart"
      >
        <path d={buildPath(incomeValues, width, height)} className="trend-line trend-line-income" />
        <path
          d={buildPath(expenseValues, width, height)}
          className="trend-line trend-line-expense"
        />
      </svg>
      <div className="trend-legend">
        <span className="legend-income">Income</span>
        <span className="legend-expense">Expense</span>
      </div>
      <div className="trend-labels">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
