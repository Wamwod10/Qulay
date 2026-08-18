import { translateText } from "../../../../localization/i18n";import { useEffect, useState } from "react";

import { Button, Input, Modal, Textarea } from "../../../../shared/ui";

const StockAdjustmentModal = ({ product, open, onClose, onSubmit }) => {
  const [stock, setStock] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (product && open) {
      setStock(String(product.stock ?? 0));
      setReason("");
      setError("");
    }
  }, [product, open]);

  if (!product) {
    return null;
  }

  const handleSubmit = () => {
    const parsedStock = Number(stock);

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setError(translateText("Yangi qoldiq manfiy yoki noto'g'ri bo'lishi mumkin emas."));
      return;
    }

    onSubmit?.({
      productId: product.id,
      newStock: parsedStock,
      reason
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText("Qoldiqni tuzatish")}
      description={product.name}
      size="sm">
      
      <div className="products-page__modal-form">
        <Input
          label={translateText("Hozirgi qoldiq")}
          value={`${product.stock} ${product.unit}`}
          disabled />
        

        <Input
          label={translateText("Yangi qoldiq")}
          type="number"
          min="0"
          value={stock}
          error={error}
          onChange={(event) => {
            setStock(event.target.value);
            setError("");
          }} />
        

        <Textarea
          label={translateText("Sabab")}
          placeholder={translateText("Masalan: inventarizatsiya natijasi...")}
          value={reason}
          onChange={(event) => setReason(event.target.value)} />
        

        <div className="products-page__modal-actions">
          <Button variant="secondary" onClick={onClose}>{translateText("Bekor qilish")}

          </Button>

          <Button onClick={handleSubmit}>{translateText("Saqlash")}</Button>
        </div>
      </div>
    </Modal>);

};

export default StockAdjustmentModal;