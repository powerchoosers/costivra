"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Calendar, Check, ChevronDown, X } from "@/lib/icons";
import { CostivraDatePicker } from "@/components/ui/costivra-date-picker";
import {
  formatDateEntry,
  parseDateEntry,
  vendorHistoryPresetOptions,
  vendorHistoryPresetRange,
  vendorHistoryRangeLabel,
  type VendorHistoryRange,
} from "@/lib/portal/vendor-history-range";
import { formatFinancialDate } from "@/lib/ui/date-format";

function rangeDescription(range: VendorHistoryRange) {
  if (!range.startDate && !range.endDate) return "Every dated record";
  if (!range.startDate) return `Through ${formatFinancialDate(range.endDate)}`;
  return `${formatFinancialDate(range.startDate)} – ${formatFinancialDate(range.endDate)}`;
}

export function VendorHistoryRangePicker({
  availableStart,
  latestRecordDate,
  onChange,
  value,
}: {
  availableStart: string | null;
  latestRecordDate: string | null;
  onChange: (range: VendorHistoryRange) => void;
  value: VendorHistoryRange;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [customVisible, setCustomVisible] = useState(value.preset === "custom");
  const [startEntry, setStartEntry] = useState(formatDateEntry(value.startDate));
  const [endEntry, setEndEntry] = useState(formatDateEntry(value.endDate));
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const close = useCallback((restoreFocus = false) => {
    if (!open || closing) return;
    setClosing(true);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, [closing, open]);

  const openPicker = () => {
    setStartEntry(formatDateEntry(value.startDate));
    setEndEntry(formatDateEntry(value.endDate));
    setCustomVisible(value.preset === "custom");
    setError(null);
    setClosing(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || closing) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, closing, open]);

  const selectPreset = (preset: Exclude<VendorHistoryRange["preset"], "custom">) => {
    onChange(vendorHistoryPresetRange(preset, latestRecordDate));
    close(true);
  };

  const applyCustomRange = () => {
    const startDate = parseDateEntry(startEntry);
    const endDate = parseDateEntry(endEntry);
    if (!startDate || !endDate) {
      setError("Enter both dates as MM/DD/YYYY.");
      return;
    }
    if (startDate > endDate) {
      setError("The start date must be before the end date.");
      return;
    }
    if (latestRecordDate && endDate > latestRecordDate) {
      setError(`The latest available record is ${formatFinancialDate(latestRecordDate)}.`);
      return;
    }
    onChange({ preset: "custom", startDate, endDate });
    close(true);
  };

  const normalizeEntry = (
    entry: string,
    setEntry: (value: string) => void,
  ) => {
    const parsed = parseDateEntry(entry);
    if (parsed) setEntry(formatDateEntry(parsed));
  };

  return (
    <div className="vendor-history-range-picker" ref={containerRef}>
      <span className="vendor-history-range-picker__label">History range</span>
      <button
        aria-controls={popoverId}
        aria-expanded={open && !closing}
        aria-haspopup="dialog"
        className="vendor-history-range-picker__trigger"
        onClick={() => open ? close() : openPicker()}
        ref={triggerRef}
        type="button"
      >
        <Calendar aria-hidden="true" size={15} />
        <span>
          <strong>{vendorHistoryRangeLabel(value)}</strong>
          <small>{rangeDescription(value)}</small>
        </span>
        <ChevronDown aria-hidden="true" size={14} />
      </button>

      {open ? (
        <section
          aria-label="Choose financial history period"
          aria-modal="false"
          className={`vendor-history-range-picker__popover${closing ? " is-closing" : ""}`}
          id={popoverId}
          onAnimationEnd={(event) => {
            if (event.currentTarget !== event.target || !closing) return;
            setOpen(false);
            setClosing(false);
          }}
          role="dialog"
        >
          <header className="vendor-history-range-picker__header">
            <div>
              <strong>History period</strong>
              <span>Choose a quick view or enter exact dates.</span>
            </div>
            <button aria-label="Close history period" className="workspace-close-control" onClick={() => close(true)} type="button">
              <X aria-hidden="true" size={15} />
            </button>
          </header>

          <div className="vendor-history-range-picker__presets">
            {vendorHistoryPresetOptions.map((option) => {
              const selected = value.preset === option.preset;
              return (
                <button
                  aria-pressed={selected}
                  className={selected ? "is-selected" : undefined}
                  key={option.preset}
                  onClick={() => selectPreset(option.preset)}
                  type="button"
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {selected ? <Check aria-hidden="true" size={14} /> : null}
                </button>
              );
            })}
          </div>

          <button
            aria-expanded={customVisible}
            className={`vendor-history-range-picker__custom-toggle${customVisible ? " is-open" : ""}`}
            onClick={() => {
              setCustomVisible((current) => !current);
              setError(null);
            }}
            type="button"
          >
            <span>
              <strong>Custom range</strong>
              <small>Type dates or choose them from the calendar</small>
            </span>
            <ChevronDown aria-hidden="true" size={14} />
          </button>

          <div aria-hidden={!customVisible} className={`vendor-history-range-picker__custom${customVisible ? " is-open" : ""}`} inert={!customVisible}>
            <div className="vendor-history-range-picker__custom-inner">
              <div className="vendor-history-range-picker__fields">
                <label>
                  <span>Start date</span>
                  <div className="vendor-history-range-picker__date-field">
                    <input
                      aria-invalid={Boolean(error)}
                      inputMode="numeric"
                      onBlur={() => normalizeEntry(startEntry, setStartEntry)}
                      onChange={(event) => { setStartEntry(event.target.value); setError(null); }}
                      placeholder="MM/DD/YYYY"
                      value={startEntry}
                    />
                    <CostivraDatePicker
                      ariaLabel="Choose history start date"
                      max={parseDateEntry(endEntry) ?? latestRecordDate ?? undefined}
                      onChange={(date) => { setStartEntry(formatDateEntry(date)); setError(null); }}
                      value={parseDateEntry(startEntry) ?? ""}
                    />
                  </div>
                </label>
                <label>
                  <span>End date</span>
                  <div className="vendor-history-range-picker__date-field">
                    <input
                      aria-invalid={Boolean(error)}
                      inputMode="numeric"
                      onBlur={() => normalizeEntry(endEntry, setEndEntry)}
                      onChange={(event) => { setEndEntry(event.target.value); setError(null); }}
                      placeholder="MM/DD/YYYY"
                      value={endEntry}
                    />
                    <CostivraDatePicker
                      ariaLabel="Choose history end date"
                      max={latestRecordDate ?? undefined}
                      min={parseDateEntry(startEntry) ?? undefined}
                      onChange={(date) => { setEndEntry(formatDateEntry(date)); setError(null); }}
                      value={parseDateEntry(endEntry) ?? ""}
                    />
                  </div>
                </label>
              </div>
              {error ? <p className="vendor-history-range-picker__error" role="alert">{error}</p> : null}
              <footer>
                <span>{availableStart && latestRecordDate ? `Available ${formatFinancialDate(availableStart)} – ${formatFinancialDate(latestRecordDate)}` : "No dated records available yet"}</span>
                <button onClick={applyCustomRange} type="button">Apply range</button>
              </footer>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
