interface SummaryCardProps {
  title: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
  trend?: string;
}

export default function SummaryCard({
  title,
  value,
  tone = "default",
  trend,
}: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card-${tone}`}>
      <div className="summary-header">
        <p>{title}</p>
      </div>
      <strong>{value}</strong>
      {trend ? <span className="summary-trend">{trend}</span> : null}
    </article>
  );
}
