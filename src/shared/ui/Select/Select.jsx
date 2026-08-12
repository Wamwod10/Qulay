import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown } from "lucide-react";

import "./Select.scss";

const Select = ({
  label,
  value = "",
  onChange,
  options = [],
  placeholder = "Tanlang",
  error,
  disabled = false,
  required = false,
  className = "",
}) => {
  const wrapperRef = useRef(null);

  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSelect = (option) => {
    if (disabled) {
      return;
    }

    onChange?.({
      target: {
        value: option.value,
      },
    });

    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={[
        "ui-select",
        open ? "ui-select--open" : "",
        error ? "ui-select--error" : "",
        disabled ? "ui-select--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label className="ui-select__label">
          {label}

          {required && <span className="ui-select__required">*</span>}
        </label>
      )}

      <button
        type="button"
        className="ui-select__trigger"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={[
            "ui-select__value",
            !selectedOption ? "ui-select__value--placeholder" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          className="ui-select__chevron"
          size={17}
          strokeWidth={1.8}
        />
      </button>

      {open && (
        <div className="ui-select__dropdown">
          <div className="ui-select__options">
            {options.length ? (
              options.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "ui-select__option",
                      selected ? "ui-select__option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(option)}
                  >
                    <span>{option.label}</span>

                    {selected && <Check size={15} strokeWidth={2} />}
                  </button>
                );
              })
            ) : (
              <div className="ui-select__empty">Variantlar yo‘q</div>
            )}
          </div>
        </div>
      )}

      {error && <span className="ui-select__error">{error}</span>}
    </div>
  );
};

export default Select;
