import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { translateOptions, translateText } from "../../../../localization/i18n";
import { UNIT_OPTIONS } from "../../../../shared/utils/units";

const StockInModal = ({ open, warehouseId, stock = [], onClose, onSubmit }) => {
  const [productId, setProductId] = useState("");

  const [quantity, setQuantity] = useState("");

  const [cost, setCost] = useState("");
  const [inputUnit, setInputUnit] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");

  const [source, setSource] = useState("Yetkazib beruvchi");

  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const warehouseItems = useMemo(() => {
    return stock.filter((item) => item.warehouseId === warehouseId);
  }, [stock, warehouseId]);

  const productOptions = warehouseItems.map((item) => ({
    value: item.productId,

    label: `${item.productName} · ${item.sku}`,
  }));

  const selectedItem = warehouseItems.find(
    (item) => item.productId === productId,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setProductId("");
    setQuantity("");
    setCost("");
    setInputUnit("");
    setBatchNumber("");
    setExpiryDate("");
    setProductionDate("");
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setSource("Yetkazib beruvchi");
    setNote("");
    setError("");
    setSubmitting(false);
    setIdempotencyKey(`stock-in:${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  }, [open]);

  useEffect(() => {
    if (selectedItem) {
      setCost(String(selectedItem.cost ?? ""));
      setInputUnit(selectedItem.unit || "");
    }
  }, [selectedItem]);

  const handleSubmit = async () => {
    setError("");
    if (submitting) return;

    if (!productId) {
      setError(translateText("Mahsulotni tanlang."));

      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError(translateText("Miqdor 0 dan katta bo‘lishi kerak."));

      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({
      warehouseId,
      productId,
      quantity,
      cost,
      inputUnit: inputUnit || selectedItem?.unit,
      batchNumber,
      expiryDate: expiryDate || null,
      productionDate: productionDate || null,
      receivedDate: receivedDate || null,
      source,
      note,
      idempotencyKey,
    });
    } catch (submitError) {
      setError(translateText(submitError.message || "Kirim qilishda xatolik yuz berdi."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Omborga kirim")}
      description={translateText("Tanlangan omborga mahsulot qabul qilish.")}
      size="md"
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <Select
          label={translateText("Mahsulot")}
          value={productId}
          placeholder={translateText("Mahsulot tanlang")}
          options={productOptions}
          onChange={(event) => setProductId(event.target.value)}
        />

        {selectedItem && (
          <Input
            label={translateText("Hozirgi qoldiq")}
            value={`${selectedItem.quantity} ${selectedItem.unit}`}
            disabled
          />
        )}

        <Input
          label={translateText("Kirim miqdori")}
          type="number"
          min="0"
          value={quantity}
          placeholder="0"
          onChange={(event) => setQuantity(event.target.value)}
        />

        <Select
          label={translateText("Kiritish birligi")}
          value={inputUnit}
          options={UNIT_OPTIONS}
          onChange={(event) => setInputUnit(event.target.value)}
        />

        <Input
          label={translateText("Tannarx")}
          type="number"
          min="0"
          value={cost}
          placeholder="0"
          onChange={(event) => setCost(event.target.value)}
        />

        <Input
          label={translateText("Batch/Lot raqami")}
          value={batchNumber}
          placeholder={translateText("Ixtiyoriy")}
          onChange={(event) => setBatchNumber(event.target.value)}
        />

        <Input
          label={translateText("Qabul sanasi")}
          type="date"
          value={receivedDate}
          onChange={(event) => setReceivedDate(event.target.value)}
        />

        <Input
          label={translateText("Ishlab chiqarilgan sana")}
          type="date"
          value={productionDate}
          onChange={(event) => setProductionDate(event.target.value)}
        />

        <Input
          label={translateText("Yaroqlilik muddati")}
          type="date"
          value={expiryDate}
          onChange={(event) => setExpiryDate(event.target.value)}
        />

        <Select
          label={translateText("Kirim manbasi")}
          value={source}
          options={translateOptions([
            {
              value: "Yetkazib beruvchi",
              label: "Yetkazib beruvchi",
            },
            {
              value: "Ishlab chiqarish",
              label: "Ishlab chiqarish",
            },
            {
              value: "Ombor ko‘chirish",
              label: "Ombor ko‘chirish",
            },
            {
              value: "Qaytarish",
              label: "Qaytarish",
            },
            {
              value: "Boshqa",
              label: "Boshqa",
            },
          ])}
          onChange={(event) => setSource(event.target.value)}
        />

        <Textarea
          label={translateText("Izoh")}
          placeholder={translateText("Kirim bo‘yicha qo‘shimcha ma’lumot...")}
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
            {translateText(submitting ? "Saqlanmoqda..." : "Kirim qilish")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StockInModal;
