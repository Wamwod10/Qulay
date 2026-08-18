import { useEffect, useMemo, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { translateOptions, translateText } from "../../../../localization/i18n";

const InventoryModal = ({
  open,
  warehouseId,
  stock = [],
  onClose,
  onSubmit,
}) => {
  const [productId, setProductId] = useState("");

  const [countedQuantity, setCountedQuantity] = useState("");

  const [reason, setReason] = useState("Rejali inventarizatsiya");

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

  const difference =
    selectedItem && countedQuantity !== ""
      ? Number(countedQuantity) - Number(selectedItem.quantity || 0)
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    setProductId("");
    setCountedQuantity("");
    setReason("Rejali inventarizatsiya");
    setNote("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (selectedItem) {
      setCountedQuantity(String(selectedItem.quantity ?? 0));
    }
  }, [selectedItem]);

  const handleSubmit = () => {
    setError("");

    if (!productId) {
      setError(translateText("Mahsulotni tanlang."));

      return;
    }

    if (countedQuantity === "") {
      setError(translateText("Sanalgan qoldiqni kiriting."));

      return;
    }

    if (Number(countedQuantity) < 0) {
      setError(translateText("Sanalgan qoldiq manfiy bo‘lishi mumkin emas."));

      return;
    }

    onSubmit?.({
      warehouseId,
      productId,

      countedQuantity: Number(countedQuantity),

      reason,
      note,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Inventarizatsiya")}
      description={translateText(
        "Tizimdagi qoldiqni real sanalgan qoldiq bilan solishtirish.",
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
          label={translateText("Mahsulot")}
          value={productId}
          placeholder={translateText("Mahsulot tanlang")}
          options={productOptions}
          onChange={(event) => setProductId(event.target.value)}
        />

        {selectedItem && (
          <>
            <Input
              label={translateText("Tizimdagi qoldiq")}
              value={`${selectedItem.quantity} ${selectedItem.unit}`}
              disabled
            />

            <Input
              label={translateText("Real sanalgan qoldiq")}
              type="number"
              min="0"
              value={countedQuantity}
              onChange={(event) => setCountedQuantity(event.target.value)}
            />

            {difference !== null && (
              <div
                style={{
                  padding: 14,
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-inset)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: 12,
                    }}
                  >
                    {translateText("Farq")}
                  </span>

                  <strong
                    style={{
                      color:
                        difference > 0
                          ? "var(--color-success)"
                          : difference < 0
                            ? "var(--color-danger)"
                            : "var(--color-text-primary)",
                    }}
                  >
                    {difference > 0 ? "+" : ""}
                    {difference} {selectedItem.unit}
                  </strong>
                </div>
              </div>
            )}
          </>
        )}

        <Select
          label={translateText("Sabab")}
          value={reason}
          options={translateOptions([
            {
              value: "Rejali inventarizatsiya",
              label: "Rejali inventarizatsiya",
            },
            {
              value: "Qoldiqdagi xato",
              label: "Qoldiqdagi xato",
            },
            {
              value: "Yo‘qotish",
              label: "Yo‘qotish",
            },
            {
              value: "Ortiqcha qoldiq",
              label: "Ortiqcha qoldiq",
            },
            {
              value: "Boshqa",
              label: "Boshqa",
            },
          ])}
          onChange={(event) => setReason(event.target.value)}
        />

        <Textarea
          label={translateText("Izoh")}
          placeholder={translateText("Inventarizatsiya haqida izoh...")}
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

          <Button onClick={handleSubmit}>{translateText("Tasdiqlash")}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default InventoryModal;
