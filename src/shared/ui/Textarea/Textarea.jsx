import { forwardRef, useId } from "react";

import "./Textarea.scss";

const Textarea = forwardRef(
  (
    { label, error, hint, required = false, className = "", id, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id || `textarea-${generatedId}`;

    const classes = [
      "ui-textarea",
      error ? "ui-textarea--error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={classes}>
        {label && (
          <label htmlFor={textareaId} className="ui-textarea__label">
            {label}

            {required && <span className="ui-textarea__required">*</span>}
          </label>
        )}

        <textarea ref={ref} id={textareaId} required={required} {...props} />

        {error ? (
          <span className="ui-textarea__error">{error}</span>
        ) : hint ? (
          <span className="ui-textarea__hint">{hint}</span>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
