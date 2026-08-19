import { translateText } from "../../../../localization/i18n";import { useEffect, useState } from "react";

import { Button, Input, Modal } from "../../../../shared/ui";

import "./PurchaseReceiveModal.scss";

const PurchaseReceiveModal = ({ open, purchase, onClose, onSubmit }) => {
  const [quantities, setQuantities] = useState({});

  const [error, setError] = useState("");

  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    if (!open || !purchase) {
      return;
    }

    const next = {};

    purchase.items.forEach((item) => {
      const remaining = Math.max(
        Number(item.quantity || 0) - Number(item.receivedQuantity || 0),
        0
      );

      next[item.id] = String(remaining);
    });

    setQuantities(next);
    setError("");
    setExpiryDate("");
  }, [open, purchase]);

  if (!purchase) {
    return null;
  }

  const handleSubmit = () => {
    const receivedItems = purchase.items.map((item) => {
      const quantity = Number(quantities[item.id] || 0);

      const remaining = Math.max(
        Number(item.quantity || 0) - Number(item.receivedQuantity || 0),
        0
      );

      if (quantity > remaining) {
        return {
          error: true,
          productName: item.productName
        };
      }

      return {
        itemId: item.id,

        productId: item.productId,
        quantity,
        expiryDate: expiryDate || null
      };
    });

    const invalid = receivedItems.find((item) => item.error);

    if (invalid) {
      setError(`${invalid.productName} uchun qolgan miqdordan ko‘p kiritildi.`);

      return;
    }

    const validItems = receivedItems.filter(
      (item) => Number(item.quantity) > 0
    );

    if (!validItems.length) {
      setError(translateText("Kamida bitta mahsulot uchun qabul miqdorini kiriting."));

      return;
    }

    onSubmit?.(validItems);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Mahsulotlarni qabul qilish")}
      description={`${purchase.number} · ${purchase.supplierName}`}
      size="lg">
      
      <div className="purchase-receive-modal">
        <div className="purchase-receive-modal__header">
          <span>{translateText("Mahsulot")}</span>

          <span>{translateText("Buyurtma")}</span>

          <span>{translateText("Oldin qabul")}</span>

          <span>{translateText("Hozir qabul")}</span>

          <span>{translateText("Qoladi")}</span>
        </div>

        <div className="purchase-receive-modal__items">
          {purchase.items.map((item) => {
            const ordered = Number(item.quantity || 0);

            const received = Number(item.receivedQuantity || 0);

            const current = Number(quantities[item.id] || 0);

            const remaining = Math.max(ordered - received - current, 0);

            return (
              <div key={item.id} className="purchase-receive-modal__row">
                <div className="purchase-receive-modal__product">
                  <strong>{item.productName}</strong>

                  <span>SKU: {item.sku || "—"}</span>
                </div>

                <span>
                  {ordered} {item.unit}
                </span>

                <span>
                  {received} {item.unit}
                </span>

                <Input
                  type="number"
                  min="0"
                  max={ordered - received}
                  value={quantities[item.id] || ""}
                  onChange={(event) =>
                  setQuantities((current) => ({
                    ...current,

                    [item.id]: event.target.value
                  }))
                  } />
                

                <strong>
                  {remaining} {item.unit}
                </strong>
              </div>);

          })}
        </div>

        <Input label={translateText("Batch yaroqlilik muddati (ixtiyoriy)")} type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />

        {error && <div className="purchase-receive-modal__error">{error}</div>}

        <div className="purchase-receive-modal__actions">
          <Button variant="secondary" onClick={onClose}>{translateText("Bekor qilish")}

          </Button>

          <Button onClick={handleSubmit}>{translateText("Qabul qilish")}</Button>
        </div>
      </div>
    </Modal>);

};

export default PurchaseReceiveModal;
