import { translateText } from "../../../../localization/i18n";import { useEffect, useState } from "react";

import { Button, Input, Modal, Select, Textarea } from "../../../../shared/ui";
import { getDefaultWarehouseId } from "../../../warehouse/utils/warehouseDefaults";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

const StockAdjustmentModal = ({ product, open, onClose, onSubmit }) => {
  const warehouses = getStoredWarehouses().filter((warehouse) => warehouse.status === "ACTIVE");
  const initialWarehouseId =
    product?.stockItems?.find((item) => Number(item.quantity || 0) > 0)?.warehouseId ||
    product?.stockItems?.[0]?.warehouseId ||
    product?.warehouseId ||
    getDefaultWarehouseId(warehouses);

  const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
  const [stock, setStock] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product && open) {
      const nextWarehouseId =
        product.stockItems?.find((item) => Number(item.quantity || 0) > 0)?.warehouseId ||
        product.stockItems?.[0]?.warehouseId ||
        product.warehouseId ||
        getDefaultWarehouseId(warehouses);
      const stockItem = product.stockItems?.find((item) => item.warehouseId === nextWarehouseId);

      setWarehouseId(nextWarehouseId);
      setStock(String(stockItem?.quantity ?? product.stock ?? 0));
      setReason("");
      setErrors({});
      setSubmitting(false);
    }
  }, [product, open]);

  if (!product) {
    return null;
  }

  const selectedStockItem = product.stockItems?.find((item) => item.warehouseId === warehouseId);
  const oldStock = Number(selectedStockItem?.quantity ?? product.stock ?? 0);
  const difference = Number(stock || 0) - oldStock;

  const handleSubmit = async () => {
    const parsedStock = Number(stock);
    const nextErrors = {};

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      nextErrors.stock = translateText("Yangi qoldiq manfiy yoki noto'g'ri bo'lishi mumkin emas.");
    }

    if (!warehouseId) {
      nextErrors.warehouseId = translateText("Omborni tanlang.");
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit?.({
        productId: product.id,
        warehouseId,
        newStock: parsedStock,
        reason,
        cost: product.cost,
      });
    } finally {
      setSubmitting(false);
    }
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
          value={`${oldStock} ${product.unit}`}
          disabled />

        <Select
          label={translateText("Ombor")}
          value={warehouseId}
          placeholder={translateText("Ombor tanlang")}
          options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
          error={errors.warehouseId}
          onChange={(event) => {
            const nextWarehouseId = event.target.value;
            const item = product.stockItems?.find((stockItem) => stockItem.warehouseId === nextWarehouseId);

            setWarehouseId(nextWarehouseId);
            setStock(String(item?.quantity ?? 0));
            setErrors((current) => ({ ...current, warehouseId: undefined }));
          }} />
        

        <Input
          label={translateText("Yangi qoldiq")}
          type="number"
          min="0"
          value={stock}
          error={errors.stock}
          onChange={(event) => {
            setStock(event.target.value);
            setErrors((current) => ({ ...current, stock: undefined }));
          }} />

        <Input
          label={translateText("Farq")}
          value={`${Number.isFinite(difference) ? difference : 0} ${product.unit}`}
          disabled />
        

        <Textarea
          label={translateText("Sabab")}
          placeholder={translateText("Masalan: inventarizatsiya natijasi...")}
          value={reason}
          onChange={(event) => setReason(event.target.value)} />
        

        <div className="products-page__modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>{translateText("Bekor qilish")}

          </Button>

          <Button onClick={handleSubmit} loading={submitting}>{translateText("Saqlash")}</Button>
        </div>
      </div>
    </Modal>);

};

export default StockAdjustmentModal;
