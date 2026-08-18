import { AlertTriangle } from "lucide-react";

import Button from "../Button/Button";
import Modal from "../Modal/Modal";
import { translateText } from "../../../localization/i18n";

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Tasdiqlash",
  description = "Ushbu amalni davom ettirmoqchimisiz?",
  confirmText = "Tasdiqlash",
  cancelText = "Bekor qilish",
  danger = false,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={translateText(title)}
      description={translateText(description)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {translateText(cancelText)}
          </Button>

          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {translateText(confirmText)}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "12px 0 4px",
        }}
      >
        <AlertTriangle size={42} strokeWidth={1.4} />
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
