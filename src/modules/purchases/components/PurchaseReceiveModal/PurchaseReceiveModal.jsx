import { useEffect, useState } from "react";

import { translateText } from "../../../../localization/i18n";
import { Button, Input, Modal } from "../../../../shared/ui";
import { convertQuantity } from "../../../../shared/utils/units";
import {
  convertCanonicalToPurchaseUnit,
  getPurchaseDisplayQuantity,
  getPurchaseDisplayUnit,
  roundPurchaseNumber,
} from "../../utils/purchaseHelpers";

import "./PurchaseReceiveModal.scss";

const PurchaseReceiveModal = ({ open, purchase, onClose, onSubmit, submitting = false }) => {
  const [quantities, setQuantities] = useState({});
  const [batchNumbers, setBatchNumbers] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  const [productionDates, setProductionDates] = useState({});
  const [receivedDate, setReceivedDate] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !purchase) {
      return;
    }

    const next = {};

    purchase.items.forEach((item) => {
      const remainingCanonical = Math.max(
        Number(item.quantity || 0) - Number(item.receivedQuantity || 0),
        0,
      );

      next[item.id] = String(convertCanonicalToPurchaseUnit(remainingCanonical, item));
    });

    setQuantities(next);
    setBatchNumbers({});
    setExpiryDates({});
    setProductionDates({});
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setIdempotencyKey(`purchase-receive:${purchase.id}:${Date.now()}`);
    setError("");
  }, [open, purchase]);

  if (!purchase) {
    return null;
  }

  const handleSubmit = () => {
    const receivedItems = purchase.items.map((item) => {
      const unit = getPurchaseDisplayUnit(item);
      const quantity = Number(quantities[item.id] || 0);
      const remainingCanonical = Math.max(
        Number(item.quantity || 0) - Number(item.receivedQuantity || 0),
        0,
      );
      let quantityCanonical = 0;

      try {
        quantityCanonical = convertQuantity(quantity, unit, item.unit);
      } catch {
        return {
          error: true,
          productName: item.productName,
        };
      }

      if (quantityCanonical > remainingCanonical) {
        return {
          error: true,
          productName: item.productName,
        };
      }

      return {
        itemId: item.id,
        productId: item.productId,
        quantity,
        unit,
        batchNumber: batchNumbers[item.id]?.trim() || null,
        expiryDate: expiryDates[item.id] || null,
        productionDate: productionDates[item.id] || null,
      };
    });

    const invalid = receivedItems.find((item) => item.error);

    if (invalid) {
      setError(`${invalid.productName} uchun qolgan miqdordan ko'p kiritildi.`);
      return;
    }

    const validItems = receivedItems.filter((item) => Number(item.quantity) > 0);

    if (!validItems.length) {
      setError(translateText("Kamida bitta mahsulot uchun qabul miqdorini kiriting."));
      return;
    }

    onSubmit?.({
      receivedItems: validItems,
      receivedDate,
      idempotencyKey,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Mahsulotlarni qabul qilish")}
      description={`${purchase.number} · ${purchase.supplierName || ""}`}
      size="lg"
    >
      <div className="purchase-receive-modal">
        <Input
          label={translateText("Qabul sanasi")}
          type="date"
          value={receivedDate}
          onChange={(event) => setReceivedDate(event.target.value)}
        />

        <div className="purchase-receive-modal__header">
          <span>{translateText("Mahsulot")}</span>
          <span>{translateText("Buyurtma")}</span>
          <span>{translateText("Oldin qabul")}</span>
          <span>{translateText("Hozir qabul")}</span>
          <span>{translateText("Qoladi")}</span>
          <span>{translateText("Batch")}</span>
          <span>{translateText("Yaroqlilik")}</span>
        </div>

        <div className="purchase-receive-modal__items">
          {purchase.items.map((item) => {
            const unit = getPurchaseDisplayUnit(item);
            const ordered = getPurchaseDisplayQuantity(item);
            const received = convertCanonicalToPurchaseUnit(item.receivedQuantity, item);
            const current = Number(quantities[item.id] || 0);
            const remaining = Math.max(ordered - received - current, 0);

            return (
              <div key={item.id} className="purchase-receive-modal__row">
                <div className="purchase-receive-modal__product">
                  <strong>{item.productName}</strong>
                  <span>SKU: {item.sku || "-"}</span>
                </div>

                <span>{roundPurchaseNumber(ordered)} {unit}</span>
                <span>{roundPurchaseNumber(received)} {unit}</span>

                <Input
                  type="number"
                  min="0"
                  max={Math.max(ordered - received, 0)}
                  value={quantities[item.id] || ""}
                  onChange={(event) =>
                    setQuantities((currentValues) => ({
                      ...currentValues,
                      [item.id]: event.target.value,
                    }))
                  }
                />

                <strong>{roundPurchaseNumber(remaining)} {unit}</strong>

                <Input
                  value={batchNumbers[item.id] || ""}
                  placeholder={translateText("Avto")}
                  onChange={(event) =>
                    setBatchNumbers((currentValues) => ({
                      ...currentValues,
                      [item.id]: event.target.value,
                    }))
                  }
                />

                <div className="purchase-receive-modal__dates">
                  <Input
                    type="date"
                    value={expiryDates[item.id] || ""}
                    onChange={(event) =>
                      setExpiryDates((currentValues) => ({
                        ...currentValues,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    value={productionDates[item.id] || ""}
                    onChange={(event) =>
                      setProductionDates((currentValues) => ({
                        ...currentValues,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="purchase-receive-modal__error">{error}</div>}

        <div className="purchase-receive-modal__actions">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {translateText("Bekor qilish")}
          </Button>

          <Button onClick={handleSubmit} disabled={submitting}>
            {translateText("Qabul qilish")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseReceiveModal;
