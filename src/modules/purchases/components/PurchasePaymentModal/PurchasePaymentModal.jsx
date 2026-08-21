import { useEffect, useState } from "react";

import { translateText } from "../../../../localization/i18n";
import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { apiRequest, unwrapList } from "../../../../services/api/apiClient";
import { formatPurchaseMoney } from "../../utils/purchaseHelpers";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank" },
];

const PurchasePaymentModal = ({ open, purchase, onClose, onSubmit, submitting = false }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [cashboxId, setCashboxId] = useState("");
  const [cashboxes, setCashboxes] = useState([]);
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !purchase) {
      return;
    }

    setAmount(String(purchase.debtAmount ?? 0));
    setMethod("CASH");
    setCashboxId("");
    setCashboxes([]);
    setNote("");
    setIdempotencyKey(`purchase-payment:${purchase.id}:${Date.now()}`);
    setError("");

    apiRequest("/finance/cashboxes")
      .then((result) => {
        const items = unwrapList(result, ["cashboxes"]);
        const activeItems = Array.isArray(items) ? items.filter((item) => item.status !== "INACTIVE" && item.active !== false) : [];
        setCashboxes(activeItems);
        setCashboxId(activeItems[0]?.id || "");
      })
      .catch(() => {});
  }, [open, purchase]);

  if (!purchase) {
    return null;
  }

  const debt = Number(purchase.debtAmount || 0);
  const paymentAmount = Number(amount || 0);
  const canPay = purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED";

  const handleSubmit = () => {
    if (!canPay) {
      setError(translateText("Avval xaridni qabul qiling."));
      return;
    }

    if (paymentAmount <= 0) {
      setError(translateText("To'lov 0 dan katta bo'lsin."));
      return;
    }

    if (paymentAmount > debt) {
      setError(translateText("To'lov qarz summasidan oshmasin."));
      return;
    }

    onSubmit?.({
      purchaseId: purchase.id,
      amount: paymentAmount,
      method,
      note,
      idempotencyKey,
      cashboxId: cashboxId || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("To'lov qilish")}
      description={`${purchase.number} · ${purchase.supplierName || ""}`}
      size="sm"
    >
      <div style={{ display: "grid", gap: 18 }}>
        <Input label={translateText("Jami xarid")} value={formatPurchaseMoney(purchase.total)} disabled />
        <Input label={translateText("Qolgan qarz")} value={formatPurchaseMoney(debt)} disabled />

        <Input
          label={translateText("To'lov summasi")}
          type="number"
          min="0"
          max={debt}
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={!canPay || submitting}
        />

        <Select
          label={translateText("To'lov usuli")}
          value={method}
          options={PAYMENT_METHODS}
          onChange={(event) => setMethod(event.target.value)}
          disabled={!canPay || submitting}
        />

        {cashboxes.length > 0 && (
          <Select
            label={translateText("Kassa")}
            value={cashboxId}
            options={cashboxes.map((cashbox) => ({
              value: cashbox.id,
              label: `${cashbox.name} / ${cashbox.currency || ""}`,
            }))}
            onChange={(event) => setCashboxId(event.target.value)}
            disabled={!canPay || submitting}
          />
        )}

        <Textarea
          label={translateText("Izoh")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={!canPay || submitting}
        />

        {!canPay && (
          <div style={{ color: "var(--color-warning)", fontSize: 12 }}>
            {translateText("To'lov faqat qisman yoki to'liq qabul qilingan xarid uchun kiritiladi.")}
          </div>
        )}

        {error && (
          <div style={{ color: "var(--color-danger)", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {translateText("Bekor qilish")}
          </Button>

          <Button onClick={handleSubmit} disabled={!canPay || submitting}>
            {translateText("Saqlash")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PurchasePaymentModal;
