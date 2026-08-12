import { useEffect, useState } from "react";

import { Button, Input, Modal, Textarea } from "../../../../shared/ui";

const PriceChangeModal = ({ product, open, onClose, onSubmit }) => {
  const [cost, setCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product && open) {
      setCost(String(product.cost ?? 0));
      setSalePrice(product.salePrice ?? "");
      setReason("");
      setErrors({});
    }
  }, [product, open]);

  if (!product) {
    return null;
  }

  const handleSubmit = () => {
    const parsedCost = Number(cost);
    const parsedSalePrice =
      salePrice === "" || salePrice === null ? null : Number(salePrice);
    const nextErrors = {};

    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      nextErrors.cost = "Tannarx manfiy yoki noto'g'ri bo'lishi mumkin emas.";
    }

    if (
      parsedSalePrice !== null &&
      (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0)
    ) {
      nextErrors.salePrice =
        "Sotuv narxi manfiy yoki noto'g'ri bo'lishi mumkin emas.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit?.({
      productId: product.id,
      cost: parsedCost,
      salePrice: parsedSalePrice,
      reason,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Narxni o'zgartirish"
      description={product.name}
      size="sm"
    >
      <div className="products-page__modal-form">
        <Input
          label="Tannarx"
          type="number"
          min="0"
          value={cost}
          error={errors.cost}
          onChange={(event) => {
            setCost(event.target.value);
            setErrors((current) => ({ ...current, cost: undefined }));
          }}
        />

        <Input
          label="Sotuv narxi"
          type="number"
          min="0"
          value={salePrice}
          error={errors.salePrice}
          onChange={(event) => {
            setSalePrice(event.target.value);
            setErrors((current) => ({ ...current, salePrice: undefined }));
          }}
        />

        <Textarea
          label="Sabab"
          placeholder="Masalan: yetkazib beruvchi narxi oshdi..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />

        <div className="products-page__modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>

          <Button onClick={handleSubmit}>Saqlash</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PriceChangeModal;
