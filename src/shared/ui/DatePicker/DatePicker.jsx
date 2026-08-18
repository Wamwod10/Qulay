import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getCurrentLanguage,
  translateText,
} from "../../../localization/i18n";

import "./DatePicker.scss";

const WEEK_DAYS = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
const WEEK_DAYS_TJ = ["Дш", "Сш", "Чш", "Пш", "Ҷм", "Шн", "Яш"];

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];
const MONTHS_TJ = [
  "Январ",
  "Феврал",
  "Март",
  "Апрел",
  "Май",
  "Июн",
  "Июл",
  "Август",
  "Сентябр",
  "Октябр",
  "Ноябр",
  "Декабр",
];

const pad = (value) => String(value).padStart(2, "0");

const toIsoDate = (date) => {
  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
};

const parseIsoDate = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatDate = (value) => {
  const date = parseIsoDate(value);

  if (!date) {
    return "";
  }

  return `${pad(date.getDate())}.${pad(
    date.getMonth() + 1,
  )}.${date.getFullYear()}`;
};

const isSameDay = (first, second) => {
  if (!first || !second) {
    return false;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

const DatePicker = ({
  label,
  value = "",
  onChange,
  placeholder = "Sanani tanlang",
  error,
  disabled = false,
  required = false,
  min,
  max,
  className = "",
}) => {
  const rootRef = useRef(null);
  const language = getCurrentLanguage();
  const months = language === "tj" ? MONTHS_TJ : MONTHS;
  const weekDays = language === "tj" ? WEEK_DAYS_TJ : WEEK_DAYS;

  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);

  const initialDate = selectedDate || new Date();

  const [viewDate, setViewDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const date = selectedDate || new Date();

    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [open, selectedDate]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutside);

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const minDate = parseIsoDate(min);

  const maxDate = parseIsoDate(max);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();

    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

    /*
     * JS:
     * Sunday = 0
     *
     * Biz:
     * Monday = 0
     */
    const offset = (firstDay.getDay() + 6) % 7;

    const days = [];

    for (let index = offset; index > 0; index -= 1) {
      const date = new Date(year, month, 1 - index);

      days.push({
        date,
        outside: true,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push({
        date: new Date(year, month, day),
        outside: false,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(year, month + 1, nextDay),
        outside: true,
      });

      nextDay += 1;
    }

    return days;
  }, [viewDate]);

  const isDisabledDate = (date) => {
    const normalized = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (
      minDate &&
      normalized <
        new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    ) {
      return true;
    }

    if (
      maxDate &&
      normalized >
        new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    ) {
      return true;
    }

    return false;
  };

  const emitChange = (nextValue) => {
    onChange?.({
      target: {
        value: nextValue,
      },
    });
  };

  const handleSelectDate = (date) => {
    if (isDisabledDate(date)) {
      return;
    }

    emitChange(toIsoDate(date));

    setOpen(false);
  };

  const goPreviousMonth = () => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const goNextMonth = () => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  const handleToday = () => {
    const today = new Date();

    if (isDisabledDate(today)) {
      return;
    }

    emitChange(toIsoDate(today));

    setOpen(false);
  };

  const handleClear = (event) => {
    event.stopPropagation();

    emitChange("");
  };

  return (
    <div
      ref={rootRef}
      className={[
        "ui-date-picker",
        open ? "ui-date-picker--open" : "",
        error ? "ui-date-picker--error" : "",
        disabled ? "ui-date-picker--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label className="ui-date-picker__label">
          {label}

          {required && <span className="ui-date-picker__required">*</span>}
        </label>
      )}

      <button
        type="button"
        className="ui-date-picker__trigger"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={[
            "ui-date-picker__value",
            !value ? "ui-date-picker__value--placeholder" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value ? formatDate(value) : translateText(placeholder)}
        </span>

        <span className="ui-date-picker__trigger-actions">
          {value && !disabled && (
            <button
              type="button"
              className="ui-date-picker__clear"
              aria-label={translateText("Sanani tozalash")}
              onClick={handleClear}
            >
              <X size={14} />
            </button>
          )}

          <CalendarDays size={17} strokeWidth={1.8} />
        </span>
      </button>

      {open && (
        <div className="ui-date-picker__calendar">
          <div className="ui-date-picker__header">
            <button
              type="button"
              className="ui-date-picker__nav"
              onClick={goPreviousMonth}
            >
              <ChevronLeft size={17} />
            </button>

            <strong>
              {months[viewDate.getMonth()]} {viewDate.getFullYear()}
            </strong>

            <button
              type="button"
              className="ui-date-picker__nav"
              onClick={goNextMonth}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="ui-date-picker__weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="ui-date-picker__days">
            {calendarDays.map(({ date, outside }) => {
              const selected = isSameDay(date, selectedDate);

              const today = isSameDay(date, new Date());

              const dateDisabled = isDisabledDate(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={dateDisabled}
                  className={[
                    "ui-date-picker__day",

                    outside ? "ui-date-picker__day--outside" : "",

                    selected ? "ui-date-picker__day--selected" : "",

                    today ? "ui-date-picker__day--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="ui-date-picker__footer">
            <button type="button" onClick={() => emitChange("")}>
              {translateText("Tozalash")}
            </button>

            <button type="button" onClick={handleToday}>
              {translateText("Bugun")}
            </button>
          </div>
        </div>
      )}

      {error && <span className="ui-date-picker__error">{error}</span>}
    </div>
  );
};

export default DatePicker;
