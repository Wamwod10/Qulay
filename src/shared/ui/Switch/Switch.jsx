import "./Switch.scss";

const Switch = ({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label
      className={["ui-switch", disabled ? "ui-switch--disabled" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />

      <span className="ui-switch__track">
        <span className="ui-switch__thumb" />
      </span>

      {(label || description) && (
        <span className="ui-switch__content">
          {label && <strong>{label}</strong>}

          {description && <small>{description}</small>}
        </span>
      )}
    </label>
  );
};

export default Switch;
