import { useEffect } from "react";

import { X } from "lucide-react";
import { translateText } from "../../../localization/i18n";

import "./Modal.scss";

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (closeOnOverlay && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="ui-modal"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`ui-modal__dialog ui-modal__dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={translateText(title)}
      >
        <header className="ui-modal__header">
          <div>
            {title && <h2>{translateText(title)}</h2>}

            {description && <p>{translateText(description)}</p>}
          </div>

          <button
            type="button"
            className="ui-modal__close"
            onClick={onClose}
            aria-label={translateText("Yopish")}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="ui-modal__body">{children}</div>

        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
};

export default Modal;
