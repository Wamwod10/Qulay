import { forwardRef, useId } from "react";

import "./Input.scss";

const Input = forwardRef(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className = "",
      required = false,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();

    const inputId = id || `input-${generatedId}`;

    const classes = ["ui-input", error ? "ui-input--error" : "", className]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={classes}>
        {label && (
          <label className="ui-input__label" htmlFor={inputId}>
            {label}

            {required && <span className="ui-input__required">*</span>}
          </label>
        )}

        <div className="ui-input__control">
          {leftIcon && <span className="ui-input__icon">{leftIcon}</span>}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            inputMode={props.inputMode || (props.type === "number" ? "decimal" : undefined)}
            step={props.type === "number" && props.step === undefined ? "any" : props.step}
            onWheel={(event) => {
              if (event.currentTarget.type === "number") event.currentTarget.blur();
            }}
            {...props}
          />

          {rightIcon && <span className="ui-input__icon">{rightIcon}</span>}
        </div>

        {error ? (
          <span id={`${inputId}-error`} className="ui-input__error">{error}</span>
        ) : hint ? (
          <span className="ui-input__hint">{hint}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
