import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import "./Toast.scss";

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const Toast = ({ type = "info", title, message, onClose }) => {
  const Icon = iconMap[type] || Info;

  return (
    <div className={`ui-toast ui-toast--${type}`}>
      <div className="ui-toast__icon">
        <Icon size={20} strokeWidth={1.8} />
      </div>

      <div className="ui-toast__content">
        {title && <strong>{title}</strong>}

        {message && <p>{message}</p>}
      </div>

      <button type="button" className="ui-toast__close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
