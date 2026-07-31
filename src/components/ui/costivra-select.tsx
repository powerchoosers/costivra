"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CostivraSelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "badge" | "compact";
  autoFocus?: boolean;
  "aria-label"?: string;
  id?: string;
}

export function CostivraSelect({
  name,
  value,
  defaultValue,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  required = false,
  className = "",
  size = "md",
  variant = "default",
  autoFocus = false,
  "aria-label": ariaLabel,
  id,
}: CostivraSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  
  // Determine controlled vs uncontrolled state
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue !== undefined ? defaultValue : (options[0]?.value ?? "")
  );

  const selectedValue = isControlled ? (value ?? "") : internalValue;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = useCallback(
    (val: string) => {
      if (!isControlled) {
        setInternalValue(val);
      }
      onChange?.(val);
      setIsOpen(false);
    },
    [isControlled, onChange]
  );

  // Close on outside click
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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const idx = options.findIndex((opt) => opt.value === selectedValue);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else if (focusedIndex >= 0 && focusedIndex < options.length) {
        const option = options[focusedIndex];
        if (option && !option.disabled) {
          handleSelect(option.value);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (next < options.length && options[next]?.disabled) {
            next++;
          }
          return next < options.length ? next : prev;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && options[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  // Ensure scroll into view for keyboard nav
  useEffect(() => {
    if (isOpen && listboxRef.current && focusedIndex >= 0) {
      const activeEl = listboxRef.current.children[focusedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, focusedIndex]);

  const sizeClass =
    size === "sm"
      ? "costivra-select-sm"
      : size === "lg"
      ? "costivra-select-lg"
      : "costivra-select-md";

  const variantClass =
    variant === "badge"
      ? "costivra-select-badge"
      : variant === "compact"
      ? "costivra-select-compact"
      : "costivra-select-default";

  return (
    <div
      ref={containerRef}
      className={`costivra-select-container ${variantClass} ${sizeClass} ${
        disabled ? "is-disabled" : ""
      } ${isOpen ? "is-open" : ""} ${className}`}
    >
      {/* Hidden input for standard HTML Form / FormData submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue}
          required={required}
        />
      )}

      <button
        type="button"
        id={selectId}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="costivra-select-trigger"
      >
        <span className="costivra-select-value">
          {selectedOption ? (
            <span className="costivra-select-label">
              {selectedOption.icon && (
                <span className="costivra-select-icon">{selectedOption.icon}</span>
              )}
              {selectedOption.label}
            </span>
          ) : (
            <span className="costivra-select-placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="costivra-select-chevron" size={14} />
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `${selectId}-option-${focusedIndex}` : undefined
          }
          className="costivra-select-popover"
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === selectedValue;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={opt.value + index}
                id={`${selectId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={() => {
                  if (!opt.disabled) {
                    handleSelect(opt.value);
                  }
                }}
                onMouseEnter={() => !opt.disabled && setFocusedIndex(index)}
                className={`costivra-select-option ${
                  isSelected ? "is-selected" : ""
                } ${isFocused ? "is-focused" : ""} ${
                  opt.disabled ? "is-disabled" : ""
                }`}
              >
                <span className="costivra-select-option-content">
                  {opt.icon && (
                    <span className="costivra-select-option-icon">
                      {opt.icon}
                    </span>
                  )}
                  <span className="costivra-select-option-label">
                    {opt.label}
                  </span>
                </span>
                {isSelected && <Check className="costivra-select-check" size={14} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
