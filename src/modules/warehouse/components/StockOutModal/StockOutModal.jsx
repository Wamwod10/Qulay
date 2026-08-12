import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";

import { getAvailableStock } from "../../utils/warehouseHelpers";

const StockOutModal = ({
  open,
  warehouseId,
  stock = [],
  onClose,
  onSubmit,
}) => {
  const [productId, setProductId] = useState("");

  const [quantity, setQuantity] = useState("");

  const [reason, setReason] = useState("Ichki foydalanish");

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
    setReason("Ichki foydalanish");
    setNote("");
    setError("");
  }, [open]);

  const handleSubmit = () => {
    setError("");

    if (!productId) {
      setError("Mahsulotni tanlang.");

      return;
    }

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      setError("Miqdor 0 dan katta bo‘lishi kerak.");

      return;
    }

    if (selectedItem && amount > Number(selectedItem.quantity)) {
      setError(
        `Omborda faqat ${selectedItem.quantity} ${selectedItem.unit} mavjud.`,
      );

      return;
    }

    onSubmit?.({
      warehouseId,
      productId,
      quantity: amount,
      reason,
      note,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ombordan chiqim"
      description="Mahsulotni ombor qoldig‘idan chiqarish."
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
          <>
            <Input
              label="Jami qoldiq"
              value={`${selectedItem.quantity} ${selectedItem.unit}`}
              disabled
            />

            <Input
              label="Mavjud"
              value={`${getAvailableStock(selectedItem)} ${selectedItem.unit}`}
              disabled
            />
          </>
        )}

        <Input
          label="Chiqim miqdori"
          type="number"
          min="0"
          value={quantity}
          placeholder="0"
          onChange={(event) => setQuantity(event.target.value)}
        />

        <Select
          label="Chiqim sababi"
          value={reason}
          options={[
            {
              value: "Ichki foydalanish",
              label: "Ichki foydalanish",
            },
            {
              value: "Ishlab chiqarish",
              label: "Ishlab chiqarish",
            },
            {
              value: "Brak",
              label: "Brak",
            },
            {
              value: "Yo‘qotish",
              label: "Yo‘qotish",
            },
            {
              value: "Ombor ko‘chirish",
              label: "Ombor ko‘chirish",
            },
            {
              value: "Boshqa",
              label: "Boshqa",
            },
          ]}
          onChange={(event) => setReason(event.target.value)}
        />

        <Textarea
          label="Izoh"
          placeholder="Chiqim haqida qo‘shimcha ma’lumot..."
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

          <Button onClick={handleSubmit}>Chiqim qilish</Button>
        </div>
      </div>
    </Modal>
  );
};

export default StockOutModal;
