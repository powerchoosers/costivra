"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface CostivraDatePickerProps {
  name?: string;
  value?: string; // YYYY-MM-DD
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  id?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateString(str?: string): Date | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr?: string): string {
  const d = parseDateString(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CostivraDatePicker({
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Select date...",
  disabled = false,
  required = false,
  className = "",
  min,
  max,
  id,
}: CostivraDatePickerProps) {
  const generatedId = useId();
  const dateId = id || generatedId;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue || "");

  const currentDateStr = isControlled ? (value || "") : internalValue;
  const selectedDate = parseDateString(currentDateStr);

  const [isOpen, setIsOpen] = useState(false);
  
  // View month & year
  const initialViewDate = selectedDate || new Date();
  const [viewYear, setViewYear] = useState<number>(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialViewDate.getMonth());
  const [syncedDateStr, setSyncedDateStr] = useState(currentDateStr);

  if (currentDateStr !== syncedDateStr) {
    setSyncedDateStr(currentDateStr);
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
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

  const handleDateSelect = (date: Date) => {
    const formatted = formatDateString(date);
    if (!isControlled) {
      setInternalValue(formatted);
    }
    onChange?.(formatted);
    setIsOpen(false);
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

  const handleToday = () => {
    const today = new Date();
    handleDateSelect(today);
  };

  // Generate day grid matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const minDate = parseDateString(min);
  const maxDate = parseDateString(max);

  const today = new Date();
  const todayFormatted = formatDateString(today);

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
          value={currentDateStr}
          required={required}
        />
      )}

      <button
        type="button"
        id={dateId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="costivra-date-picker-trigger"
      >
        <CalendarIcon className="costivra-date-picker-icon" size={15} />
        <span className="costivra-date-picker-value">
          {currentDateStr ? (
            formatDisplayDate(currentDateStr)
          ) : (
            <span className="costivra-date-picker-placeholder">
              {placeholder}
            </span>
          )}
        </span>
        {currentDateStr && !required && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="costivra-date-picker-clear"
            title="Clear date"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="costivra-calendar-popover">
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
            {/* Prev month padding days */}
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

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(viewYear, viewMonth, dayNum);
              const formatted = formatDateString(dateObj);

              const isSelected = formatted === currentDateStr;
              const isToday = formatted === todayFormatted;

              let isDisabledDay = false;
              if (minDate && dateObj < minDate) isDisabledDay = true;
              if (maxDate && dateObj > maxDate) isDisabledDay = true;

              return (
                <button
                  type="button"
                  key={dayNum}
                  disabled={isDisabledDay}
                  onClick={() => handleDateSelect(dateObj)}
                  className={`costivra-calendar-day ${
                    isSelected ? "is-selected" : ""
                  } ${isToday ? "is-today" : ""} ${
                    isDisabledDay ? "is-disabled" : ""
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="costivra-calendar-footer">
            <button
              type="button"
              onClick={handleToday}
              className="costivra-calendar-btn-today"
            >
              Today
            </button>
            {currentDateStr && !required && (
              <button
                type="button"
                onClick={handleClear}
                className="costivra-calendar-btn-clear"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
