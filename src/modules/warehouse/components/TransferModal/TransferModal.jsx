import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";

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

  const [note, setNote] = useState("");

  const [error, setError] = useState("");

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
    setNote("");
    setError("");
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

  const destinationOptions = warehouseOptions.filter(
    (warehouse) => warehouse.value !== fromWarehouseId,
  );

  const handleSubmit = () => {
    setError("");

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

    if (selectedProduct && amount > Number(selectedProduct.quantity)) {
      setError(
        translateText(
          `Manba omborda faqat ${selectedProduct.quantity} ${selectedProduct.unit} mavjud.`,
        ),
      );

      return;
    }

    onSubmit?.({
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity: amount,
      note,
    });
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
            label={translateText("Manba ombordagi qoldiq")}
            value={`${selectedProduct.quantity} ${selectedProduct.unit}`}
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

          <Button onClick={handleSubmit}>{translateText("Ko‘chirish")}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;
