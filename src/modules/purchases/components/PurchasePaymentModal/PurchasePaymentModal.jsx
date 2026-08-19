import { translateText } from "../../../../localization/i18n";import { useEffect, useState } from "react";

import { Button, Input, Modal } from "../../../../shared/ui";

import { formatPurchaseMoney } from "../../utils/purchaseHelpers";

const PurchasePaymentModal = ({ open, purchase, onClose, onSubmit }) => {
  const [paidAmount, setPaidAmount] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !purchase) {
      return;
    }

    setPaidAmount(String(purchase.paidAmount ?? 0));

    setError("");
  }, [open, purchase]);

  if (!purchase) {
    return null;
  }

  const total = Number(purchase.total || 0);

  const paid = Number(paidAmount || 0);

  const debt = Math.max(total - paid, 0);

  const handleSubmit = () => {
    if (paid < 0) {
      setError(translateText("To‘lov manfiy bo‘lishi mumkin emas."));

      return;
    }

    if (paid > total) {
      setError(translateText("To‘lov jami summadan katta bo‘lishi mumkin emas."));

      return;
    }

    onSubmit?.({
      purchaseId: purchase.id,

      paidAmount: paid
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("To‘lovni yangilash")}
      description={`${purchase.number} · ${purchase.supplierName}`}
      size="sm">
      
      <div
        style={{
          display: "grid",
          gap: 18
        }}>
        
        <Input
          label={translateText("Jami xarid")}
          value={formatPurchaseMoney(total)}
          disabled />
        

        <Input
          label={translateText("To‘langan summa")}
          type="number"
          min="0"
          max={total}
          value={paidAmount}
          onChange={(event) => setPaidAmount(event.target.value)} />
        

        <div
          style={{
            padding: 15,
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-inset)"
          }}>
          
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14
            }}>
            
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: 11
              }}>{translateText("Qolgan qarz")}


            </span>

            <strong
              style={{
                color:
                debt > 0 ? "var(--color-warning)" : "var(--color-success)",
                fontSize: 14
              }}>
              
              {formatPurchaseMoney(debt)}
            </strong>
          </div>
        </div>

        {error &&
        <div
          style={{
            color: "var(--color-danger)",
            fontSize: 12
          }}>
          
            {error}
          </div>
        }

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10
          }}>
          
          <Button variant="secondary" onClick={onClose}>{translateText("Bekor qilish")}

          </Button>

          <Button onClick={handleSubmit}>{translateText("Saqlash")}</Button>
        </div>
      </div>
    </Modal>);

};

export default PurchasePaymentModal;
