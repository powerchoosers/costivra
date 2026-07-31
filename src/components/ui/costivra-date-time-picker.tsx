"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface CostivraDateTimePickerProps {
  name?: string;
  value?: string; // YYYY-MM-DDTHH:mm
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateTimeString(str?: string): { dateStr: string; hours: number; minutes: number } | null {
  if (!str) return null;
  // Format expected: YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
  const normalized = str.replace(" ", "T");
  const [dPart, tPart] = normalized.split("T");
  if (!dPart) return null;

  let hours = 12;
  let minutes = 0;

  if (tPart) {
    const tParts = tPart.split(":");
    if (tParts.length >= 2) {
      hours = parseInt(tParts[0], 10) || 0;
      minutes = parseInt(tParts[1], 10) || 0;
    }
  }

  return { dateStr: dPart, hours, minutes };
}

function formatDisplayDateTime(str?: string): string {
  const parsed = parseDateTimeString(str);
  if (!parsed) return "";
  const { dateStr, hours, minutes } = parsed;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return str || "";

  const dateObj = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );

  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = String(minutes).padStart(2, "0");

  return `${formattedDate} at ${displayHours}:${displayMinutes} ${period}`;
}

export function CostivraDateTimePicker({
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Select date & time...",
  disabled = false,
  required = false,
  className = "",
  id,
}: CostivraDateTimePickerProps) {
  const generatedId = useId();
  const dateTimeId = id || generatedId;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue || "");

  const currentStr = isControlled ? (value || "") : internalValue;
  const parsed = parseDateTimeString(currentStr);

  const selectedDateStr = parsed?.dateStr || "";
  const selectedHours = parsed?.hours ?? 12;
  const selectedMinutes = parsed?.minutes ?? 0;

  const [isOpen, setIsOpen] = useState(false);

  // View state for calendar
  const initialDateParts = selectedDateStr ? selectedDateStr.split("-") : [];
  const initialYear = initialDateParts.length === 3 ? parseInt(initialDateParts[0], 10) : new Date().getFullYear();
  const initialMonth = initialDateParts.length === 3 ? parseInt(initialDateParts[1], 10) - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);
  const [syncedDateStr, setSyncedDateStr] = useState(selectedDateStr);

  if (selectedDateStr !== syncedDateStr) {
    setSyncedDateStr(selectedDateStr);
    const parts = selectedDateStr.split("-");
    if (parts.length === 3) {
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const updateCombinedValue = (dateStr: string, hrs: number, mins: number) => {
    const formattedHrs = String(hrs).padStart(2, "0");
    const formattedMins = String(mins).padStart(2, "0");
    const fullVal = `${dateStr}T${formattedHrs}:${formattedMins}`;

    if (!isControlled) {
      setInternalValue(fullVal);
    }
    onChange?.(fullVal);
  };

  const handleDateSelect = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    updateCombinedValue(dateStr, selectedHours, selectedMinutes);
  };

  const handleTimeChange = (hrs: number, mins: number) => {
    const activeDateStr = selectedDateStr || (() => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    })();

    updateCombinedValue(activeDateStr, hrs, mins);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar Day matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Time conversion for 12hr controls
  const period = selectedHours >= 12 ? "PM" : "AM";
  const displayHours = selectedHours % 12 === 0 ? 12 : selectedHours % 12;

  return (
    <div
      ref={containerRef}
      className={`costivra-date-picker-container ${
        disabled ? "is-disabled" : ""
      } ${isOpen ? "is-open" : ""} ${className}`}
    >
      {/* Hidden input for FormData */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentStr}
          required={required}
        />
      )}

      <button
        type="button"
        id={dateTimeId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="costivra-date-picker-trigger"
      >
        <CalendarIcon className="costivra-date-picker-icon" size={15} />
        <span className="costivra-date-picker-value">
          {currentStr ? (
            formatDisplayDateTime(currentStr)
          ) : (
            <span className="costivra-date-picker-placeholder">
              {placeholder}
            </span>
          )}
        </span>
        {currentStr && !required && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="costivra-date-picker-clear"
            title="Clear date & time"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="costivra-calendar-popover costivra-datetime-popover">
          <div className="costivra-calendar-header">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="costivra-calendar-nav"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="costivra-calendar-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="costivra-calendar-nav"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="costivra-calendar-weekdays">
            {DAY_NAMES.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="costivra-calendar-grid">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="costivra-calendar-day outside"
                >
                  {dayNum}
                </span>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(viewYear, viewMonth, dayNum);
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
              const dd = String(dateObj.getDate()).padStart(2, "0");
              const dateStr = `${yyyy}-${mm}-${dd}`;

              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayDateStr;

              return (
                <button
                  type="button"
                  key={dayNum}
                  onClick={() => handleDateSelect(dateObj)}
                  className={`costivra-calendar-day ${
                    isSelected ? "is-selected" : ""
                  } ${isToday ? "is-today" : ""}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="costivra-time-picker-section">
            <div className="costivra-time-picker-label">
              <Clock size={13} />
              <span>Time</span>
            </div>
            <div className="costivra-time-picker-controls">
              <select
                value={displayHours}
                onChange={(e) => {
                  const h12 = parseInt(e.target.value, 10);
                  let h24 = h12;
                  if (period === "PM" && h12 !== 12) h24 = h12 + 12;
                  if (period === "AM" && h12 === 12) h24 = 0;
                  handleTimeChange(h24, selectedMinutes);
                }}
                className="costivra-time-select"
                aria-label="Hour"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>

              <span className="costivra-time-colon">:</span>

              <select
                value={selectedMinutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value, 10);
                  handleTimeChange(selectedHours, mins);
                }}
                className="costivra-time-select"
                aria-label="Minute"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const newPeriod = period === "AM" ? "PM" : "AM";
                  let h24 = selectedHours;
                  if (newPeriod === "PM" && selectedHours < 12) h24 += 12;
                  if (newPeriod === "AM" && selectedHours >= 12) h24 -= 12;
                  handleTimeChange(h24, selectedMinutes);
                }}
                className="costivra-period-toggle"
              >
                {period}
              </button>
            </div>
          </div>

          <div className="costivra-calendar-footer">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="costivra-calendar-btn-today"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
