import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";

const StockInModal = ({ open, warehouseId, stock = [], onClose, onSubmit }) => {
  const [productId, setProductId] = useState("");

  const [quantity, setQuantity] = useState("");

  const [cost, setCost] = useState("");

  const [source, setSource] = useState("Yetkazib beruvchi");

  const [note, setNote] = useState("");

  const [error, setError] = useState("");

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
    setSource("Yetkazib beruvchi");
    setNote("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (selectedItem) {
      setCost(String(selectedItem.cost ?? ""));
    }
  }, [selectedItem]);

  const handleSubmit = () => {
    setError("");

    if (!productId) {
      setError("Mahsulotni tanlang.");

      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Miqdor 0 dan katta bo‘lishi kerak.");

      return;
    }

    onSubmit?.({
      warehouseId,
      productId,
      quantity,
      cost,
      source,
      note,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Omborga kirim"
      description="Tanlangan omborga mahsulot qabul qilish."
      size="md"
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <Select
          label="Mahsulot"
          value={productId}
          placeholder="Mahsulot tanlang"
          options={productOptions}
          onChange={(event) => setProductId(event.target.value)}
        />

        {selectedItem && (
          <Input
            label="Hozirgi qoldiq"
            value={`${selectedItem.quantity} ${selectedItem.unit}`}
            disabled
          />
        )}

        <Input
          label="Kirim miqdori"
          type="number"
          min="0"
          value={quantity}
          placeholder="0"
          onChange={(event) => setQuantity(event.target.value)}
        />

        <Input
          label="Tannarx"
          type="number"
          min="0"
          value={cost}
          placeholder="0"
          onChange={(event) => setCost(event.target.value)}
        />

        <Select
          label="Kirim manbasi"
          value={source}
          options={[
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
          ]}
          onChange={(event) => setSource(event.target.value)}
        />

        <Textarea
          label="Izoh"
          placeholder="Kirim bo‘yicha qo‘shimcha ma’lumot..."
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
            Bekor qilish
          </Button>

          <Button onClick={handleSubmit}>Kirim qilish</Button>
        </div>
      </div>
    </Modal>
  );
};

export default StockInModal;
