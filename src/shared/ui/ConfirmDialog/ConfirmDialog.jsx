import { AlertTriangle } from "lucide-react";

import Button from "../Button/Button";
import Modal from "../Modal/Modal";

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
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>

          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
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
