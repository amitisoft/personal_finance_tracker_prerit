interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface SimpleBarChartProps {
  data: BarDatum[];
}

export default function SimpleBarChart({ data }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-label-row">
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString("en-IN")}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
