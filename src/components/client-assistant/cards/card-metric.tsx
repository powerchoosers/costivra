"use client";

export function CardMetric({
  amount,
  currency = "USD",
  period,
  changePercent,
}: {
  amount: number | null | undefined;
  currency?: string;
  period?: string;
  changePercent?: number | null;
}) {
  if (amount == null) {
    return <span className="card-metric-unavailable">Value unrecorded</span>;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

  return (
    <div className="card-metric-group">
      <span className="card-metric-value">{formatted}</span>
      {period && <span className="card-metric-period">/{period}</span>}
      {changePercent != null && (
        <span
          className={`card-metric-change ${
            changePercent > 0 ? "card-metric-change--up" : changePercent < 0 ? "card-metric-change--down" : ""
          }`}
        >
          {changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}
        </span>
      )}
    </div>
  );
}
