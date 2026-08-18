import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import "./PasswordField.scss";

const PasswordField = ({ label, error, id, autoComplete, value, onChange, name }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={["password-field", error ? "password-field--error" : ""].filter(Boolean).join(" ")}>
      <label className="password-field__label" htmlFor={id}>
        {label}
        <span>*</span>
      </label>
      <div className="password-field__control">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange}
        />
        <button
          type="button"
          aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <span className="password-field__error">{error}</span>}
    </div>
  );
};

export default PasswordField;
