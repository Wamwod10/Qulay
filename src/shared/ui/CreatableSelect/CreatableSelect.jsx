import { useEffect, useId, useRef, useState } from "react";

import { Plus, Check, ChevronDown } from "lucide-react";
import { getApiErrorMessage } from "../../../services/api/apiErrorHandler";

import "./CreatableSelect.scss";

const CreatableSelect = ({
  label,
  value = "",
  onChange,
  options = [],
  placeholder = "Tanlang",
  error,
  disabled = false,
  required = false,
  onCreate,
  createLabel = "Qo'shish",
  getOptionSearchText,
  className = "",
}) => {
  const generatedId = useId();
  const selectId = `creatable-select-${generatedId}`;
  const wrapperRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdOption, setCreatedOption] = useState(null);

  const selected =
    options.find((option) => option.value === value) ||
    (createdOption?.value === value ? createdOption : null);

  useEffect(() => {
    const close = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, []);

  const select = (option) => {
    setCreatedOption(option);

    onChange?.({
      target: {
        value: option.value,
      },
    });

    setOpen(false);
    setDraft("");
    setCreateError("");
  };

  const getSearchText = (option) =>
    String(getOptionSearchText?.(option) || option.label || "")
      .trim()
      .toLocaleLowerCase();

  const normalizedDraft = draft.trim().toLocaleLowerCase();

  const filteredOptions = options.filter((option) => {
    if (!normalizedDraft) return true;
    return getSearchText(option).includes(normalizedDraft);
  });

  const duplicateOption = options.find((option) => {
    const searchText = getSearchText(option);
    return searchText
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => part === normalizedDraft) ||
      String(option.label || "").trim().toLocaleLowerCase() === normalizedDraft;
  });

  const create = async () => {
    const name = draft.trim();

    if (!name || !onCreate || saving) {
      return;
    }

    if (duplicateOption) {
      select(duplicateOption);
      return;
    }

    setSaving(true);
    setCreateError("");

    try {
      const created = await onCreate(name);

      if (created?.id || created?.value) {
        const option = {
          value: created.id || created.value,
          label: created.name || created.label || name,
        };

        select(option);
      }
    } catch (createRequestError) {
      setCreateError(getApiErrorMessage(createRequestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={[
        "ui-creatable-select",
        open ? "ui-creatable-select--open" : "",
        error ? "ui-creatable-select--error" : "",
        disabled ? "ui-creatable-select--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label className="ui-creatable-select__label" htmlFor={selectId}>
          {label}

          {required && (
            <span className="ui-creatable-select__required">*</span>
          )}
        </label>
      )}

      <button
        type="button"
        id={selectId}
        className="ui-creatable-select__trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onClick={() => {
          setOpen((current) => !current);
          setCreateError("");
        }}
      >
        <span
          className={
            !selected ? "ui-creatable-select__placeholder" : ""
          }
        >
          {selected?.label || placeholder}
        </span>

        <ChevronDown size={17} />
      </button>

      {open && (
        <div className="ui-creatable-select__dropdown">
          <input
            autoFocus
            disabled={saving}
            value={draft}
            placeholder="Yangi qiymat yozing"
            aria-label="Yangi qiymat"
            onChange={(event) => {
              setDraft(event.target.value);
              setCreateError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                create();
              }

              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          />

          <div className="ui-creatable-select__options">
            {filteredOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className="ui-creatable-select__option"
                onClick={() => select(option)}
              >
                <span>{option.label}</span>

                {option.value === value && <Check size={15} />}
              </button>
            ))}

            {!filteredOptions.length && (
              <div className="ui-creatable-select__empty">Variant topilmadi</div>
            )}
          </div>

          {onCreate && !duplicateOption && (
            <button
              type="button"
              className="ui-creatable-select__create"
              disabled={!draft.trim() || saving}
              onClick={create}
            >
              <Plus size={15} />

              {saving
                ? "Saqlanmoqda..."
                : `${createLabel}: ${draft.trim() || "..."}`}
            </button>
          )}

          {createError && (
            <span
              className="ui-creatable-select__error"
              role="alert"
            >
              {createError}
            </span>
          )}
        </div>
      )}

      {error && (
        <span
          id={`${selectId}-error`}
          className="ui-creatable-select__error"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default CreatableSelect;
