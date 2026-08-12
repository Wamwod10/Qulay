import { Check } from "lucide-react";

import "./Checkbox.scss";

const Checkbox = ({ checked = false, onChange, label, disabled = false }) => {
  return (
    <label
      className={["ui-checkbox", disabled ? "ui-checkbox--disabled" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />

      <span className="ui-checkbox__box">
        {checked && <Check size={14} strokeWidth={2.2} />}
      </span>

      {label && <span className="ui-checkbox__label">{label}</span>}
    </label>
  );
};

export default Checkbox;
