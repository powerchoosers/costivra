"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, CalendarClock, ChevronRight, ReceiptText } from "@/lib/icons";
import { VendorHistoryRangePicker } from "@/components/vendor-history-range-picker";
import type { PortalData } from "@/lib/portal/types";
import { buildVendorSpendHistory, type VendorSpendHistoryPoint } from "@/lib/portal/vendor-spend-history";
import { vendorHistoryPresetRange, type VendorHistoryRange } from "@/lib/portal/vendor-history-range";
import { formatFinancialDate } from "@/lib/ui/date-format";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function compactDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

function pointDateDescription(point: VendorSpendHistoryPoint) {
  return point.dateSource === "invoice_date"
    ? `Invoice date ${formatFinancialDate(point.date)}`
    : point.dateSource === "service_period"
      ? `Service period ending ${formatFinancialDate(point.date)}`
      : `Expense period ending ${formatFinancialDate(point.date)}`;
}

function sourceDescription(source: "invoice" | "expense" | "none") {
  return source === "invoice"
    ? "Invoice charges are sorted by invoice date. A service-period date is used only when the invoice date was not extracted."
    : source === "expense"
      ? "No usable invoice dates are available yet, so normalized expense records are shown as a temporary history."
      : "Add dated invoices to see this vendor’s charges in chronological order.";
}

export function VendorSpendHistory({
  invoices,
  expenses,
  currency,
}: {
  invoices: PortalData["invoices"];
  expenses: PortalData["expenses"];
  currency: string;
}) {
  const fullHistory = useMemo(
    () => buildVendorSpendHistory(invoices, expenses, { currency, limit: null }),
    [currency, expenses, invoices],
  );
  const availableStart = fullHistory.points[0]?.date ?? null;
  const latestRecordDate = fullHistory.points.at(-1)?.date ?? null;
  const [range, setRange] = useState<VendorHistoryRange>(() => vendorHistoryPresetRange("12m", latestRecordDate));
  const history = useMemo(
    () => buildVendorSpendHistory(invoices, expenses, {
      currency,
      endDate: range.endDate,
      limit: null,
      startDate: range.startDate,
    }),
    [currency, expenses, invoices, range.endDate, range.startDate],
  );
  const points = history.points;
  const absoluteMaximum = Math.max(...points.map((point) => Math.abs(point.amount)), 1);
  const total = points.reduce((sum, point) => sum + point.amount, 0);
  const recentPoints = [...points].reverse().slice(0, 5);

  return (
    <section className="vendor-spend-history portal-panel" aria-labelledby="vendor-spend-history-heading">
      <header className="vendor-spend-history__heading">
        <div>
          <span className="vendor-spend-history__eyebrow">Financial history</span>
          <h2 id="vendor-spend-history-heading">Invoice charges over time</h2>
          <p>{sourceDescription(history.source)}</p>
        </div>
        <VendorHistoryRangePicker
          availableStart={availableStart}
          latestRecordDate={latestRecordDate}
          onChange={setRange}
          value={range}
        />
      </header>

      {points.length ? (
        <>
          <div className="vendor-spend-history__summary" aria-label="Spend history summary">
            <div>
              <span>Shown total</span>
              <strong>{money(total, currency)}</strong>
              <small>{points.length} dated {history.source === "invoice" ? "invoice" : "record"}{points.length === 1 ? "" : "s"}</small>
            </div>
            <div>
              <span>Average record</span>
              <strong>{money(total / points.length, currency)}</strong>
              <small>Across the selected history</small>
            </div>
          </div>

          <div className="vendor-spend-history__chart-wrap">
            <div
              className="vendor-spend-history__chart"
              role="list"
              aria-label={`Chronological ${history.source === "invoice" ? "invoice charges" : "recorded expenses"}`}
            >
              {points.map((point) => (
                <Link
                  aria-label={`${point.label}, ${money(point.amount, currency)}, ${pointDateDescription(point)}`}
                  className="vendor-spend-history__bar"
                  data-negative={point.amount < 0 ? "true" : undefined}
                  href={point.href}
                  key={point.id}
                  role="listitem"
                  title={`${point.label} · ${money(point.amount, currency)} · ${pointDateDescription(point)}`}
                >
                  <span className="vendor-spend-history__bar-value">{money(point.amount, currency)}</span>
                  <span className="vendor-spend-history__bar-track" aria-hidden="true">
                    <span style={{ height: `${Math.max(8, (Math.abs(point.amount) / absoluteMaximum) * 100)}%` }} />
                  </span>
                  <span className="vendor-spend-history__bar-label">{compactDate(point.date)}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="vendor-spend-history__recent">
            <div className="vendor-spend-history__recent-heading">
              <div>
                <h3>Recent records</h3>
                <p>Select a record to review the source and details.</p>
              </div>
              <Link href="?tab=bills">View all bills <ChevronRight size={14} aria-hidden="true" /></Link>
            </div>
            <div className="vendor-spend-history__recent-list">
              {recentPoints.map((point) => (
                <Link className="vendor-spend-history__recent-row" href={point.href} key={point.id}>
                  <span className="vendor-spend-history__recent-icon" aria-hidden="true"><ReceiptText size={15} /></span>
                  <span>
                    <strong>{point.label}</strong>
                    <small>{pointDateDescription(point)}</small>
                  </span>
                  <strong>{money(point.amount, currency)}</strong>
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="vendor-spend-history__empty">
          <span className="vendor-spend-history__empty-icon" aria-hidden="true"><BarChart3 size={18} /></span>
          <div>
            <strong>{fullHistory.points.length ? "No records in this period" : invoices.length ? "No complete invoice history yet" : "No invoice history yet"}</strong>
            <p>{fullHistory.points.length ? "Choose a wider history period or enter a different date range." : history.missingDateCount || history.missingAmountCount ? "Some invoice records are missing a usable date or charge amount. Complete the source review to make them chartable." : sourceDescription(history.source)}</p>
          </div>
        </div>
      )}

      <p className="vendor-spend-history__note">
        <CalendarClock size={14} aria-hidden="true" /> This view shows recorded invoice charges, not confirmed bank-settled payments. Values are kept in {currency} and different currencies are not combined.
        {history.excludedCurrencyCount ? ` ${history.excludedCurrencyCount} record${history.excludedCurrencyCount === 1 ? "" : "s"} in another currency ${history.excludedCurrencyCount === 1 ? "is" : "are"} excluded.` : ""}
      </p>
    </section>
  );
}
