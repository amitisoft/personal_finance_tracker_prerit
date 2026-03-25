import { clampPercent } from "../utils/formatters";

interface ProgressBarProps {
  value: number;
  tone?: "blue" | "green" | "amber" | "red";
}

export default function ProgressBar({
  value,
  tone = "blue",
}: ProgressBarProps) {
  return (
    <div className="progress-track" aria-hidden="true">
      <div
        className={`progress-fill progress-fill-${tone}`}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}
