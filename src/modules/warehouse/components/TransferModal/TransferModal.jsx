import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";
import { convertQuantity, UNIT_OPTIONS } from "../../../../shared/utils/units";

import { getStoredWarehouses } from "../../utils/warehouseManagementStorage";

const TransferModal = ({
  open,
  currentWarehouseId,
  stock = [],
  onClose,
  onSubmit,
}) => {
  const [fromWarehouseId, setFromWarehouseId] = useState(currentWarehouseId);

  const [toWarehouseId, setToWarehouseId] = useState("");

  const [productId, setProductId] = useState("");

  const [quantity, setQuantity] = useState("");
  const [inputUnit, setInputUnit] = useState("");

  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const warehouses = useMemo(() => getStoredWarehouses(), [open]);

  const warehouseOptions = warehouses
    .filter((warehouse) => warehouse.status !== "INACTIVE")
    .map((warehouse) => ({
      value: warehouse.id,

      label: warehouse.name,
    }));

  useEffect(() => {
    if (!open) {
      return;
    }

    setFromWarehouseId(currentWarehouseId);

    setToWarehouseId("");
    setProductId("");
    setQuantity("");
    setInputUnit("");
    setNote("");
    setError("");
    setSubmitting(false);
    setIdempotencyKey(`transfer:${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  }, [open, currentWarehouseId]);

  const sourceItems = useMemo(() => {
    return stock.filter(
      (item) =>
        item.warehouseId === fromWarehouseId && Number(item.quantity || 0) > 0,
    );
  }, [stock, fromWarehouseId]);

  const productOptions = sourceItems.map((item) => ({
    value: item.productId,

    label: `${item.productName} · ${item.sku}`,
  }));

  const selectedProduct = sourceItems.find(
    (item) => item.productId === productId,
  );

  useEffect(() => {
    if (selectedProduct) {
      setInputUnit(selectedProduct.unit || "");
    }
  }, [selectedProduct]);

  const destinationOptions = warehouseOptions.filter(
    (warehouse) => warehouse.value !== fromWarehouseId,
  );

  const handleSubmit = async () => {
    setError("");
    if (submitting) return;

    if (!fromWarehouseId) {
      setError(translateText("Manba omborni tanlang."));

      return;
    }

    if (!toWarehouseId) {
      setError(translateText("Qabul qiluvchi omborni tanlang."));

      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setError(
        translateText(
          "Manba va qabul qiluvchi ombor bir xil bo‘lishi mumkin emas.",
        ),
      );

      return;
    }

    if (!productId) {
      setError(translateText("Mahsulotni tanlang."));

      return;
    }

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      setError(translateText("Miqdor 0 dan katta bo‘lishi kerak."));

      return;
    }

    let canonicalAmount = amount;
    try {
      canonicalAmount = selectedProduct ? convertQuantity(amount, inputUnit || selectedProduct.unit, selectedProduct.unit) : amount;
    } catch {
      setError(translateText("Tanlangan birlik mahsulot birligi bilan mos emas."));
      return;
    }

    if (selectedProduct && canonicalAmount > Number(selectedProduct.available ?? selectedProduct.quantity)) {
      setError(
        translateText(
          `Mavjud qoldiq yetarli emas. Mavjud: ${selectedProduct.available ?? selectedProduct.quantity} ${selectedProduct.unit}.`,
        ),
      );

      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity: amount,
      inputUnit: inputUnit || selectedProduct?.unit,
      note,
      idempotencyKey,
    });
    } catch (submitError) {
      setError(translateText(submitError.message || "Ko'chirishda xatolik yuz berdi."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Omborlar orasida ko‘chirish")}
      description={translateText(
        "Mahsulot qoldig‘ini bir ombordan boshqa omborga o‘tkazish.",
      )}
      size="md"
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <Select
          label={translateText("Manba ombor")}
          value={fromWarehouseId}
          options={warehouseOptions}
          onChange={(event) => {
            setFromWarehouseId(event.target.value);

            setProductId("");
          }}
        />

        <Select
          label={translateText("Qabul qiluvchi ombor")}
          value={toWarehouseId}
          placeholder={translateText("Ombor tanlang")}
          options={destinationOptions}
          onChange={(event) => setToWarehouseId(event.target.value)}
        />

        <Select
          label={translateText("Mahsulot")}
          value={productId}
          placeholder={translateText("Mahsulot tanlang")}
          options={productOptions}
          onChange={(event) => setProductId(event.target.value)}
        />

        {selectedProduct && (
          <Input
            label={translateText("Manba ombordagi mavjud")}
            value={`${selectedProduct.available ?? selectedProduct.quantity} ${selectedProduct.unit}`}
            disabled
          />
        )}

        <Input
          label={translateText("Ko‘chirish miqdori")}
          type="number"
          min="0"
          value={quantity}
          placeholder="0"
          onChange={(event) => setQuantity(event.target.value)}
        />

        <Select
          label={translateText("Ko'chirish birligi")}
          value={inputUnit}
          options={UNIT_OPTIONS}
          onChange={(event) => setInputUnit(event.target.value)}
        />

        <Textarea
          label={translateText("Izoh")}
          placeholder={translateText(
            "Masalan: ishlab chiqarish omboriga ko‘chirildi...",
          )}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {error && (
          <div
            style={{
              color: "var(--color-danger)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            {translateText("Bekor qilish")}
          </Button>

          <Button onClick={handleSubmit} disabled={submitting}>
            {translateText(submitting ? "Saqlanmoqda..." : "Ko'chirish")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;
