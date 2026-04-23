import type { ReactElement } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  iconSrc: string;
}

export function MetricCard({ title, value, iconSrc }: MetricCardProps): ReactElement {
  return (
    <div className="glass-card metric">
      <div className="metric-top">
        <img className="metric-icon" src={iconSrc} alt="" aria-hidden="true" />
        <span className="metric-title">{title}</span>
      </div>
      <div className="metric-divider" aria-hidden="true" />
      <div className="metric-value">{value}</div>
    </div>
  );
}
