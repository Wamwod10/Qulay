import { useState } from "react";

import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";
import { Modal } from "../../../../shared/ui";
import ProductForm from "../ProductForm/ProductForm";
import { createStoredProduct } from "../../utils/productsStorage";
import { getDefaultWarehouseId } from "../../../warehouse/utils/warehouseDefaults";

import "./ProductFormModal.scss";

const ProductFormModal = ({
  open,
  onClose,
  onCreated,
  defaultValues = {},
  inlineModule = "manufacturing",
  title = "Yangi mahsulot qo'shish",
}) => {
  const [error, setError] = useState("");
  const [field, setField] = useState("");

  if (!open) return null;

  const handleSubmit = async (product) => {
    setError("");
    setField("");

    try {
      const created = await createStoredProduct(product, { inlineModule });
      onCreated?.(created);
      onClose?.();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
      setField(submitError?.field || "");
    }
  };

  const handleClose = () => {
    setError("");
    setField("");
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description="Mahsulot katalogga to'liq ma'lumotlari bilan saqlanadi."
      size="lg"
      closeOnOverlay={false}
    >
      <ProductForm
        initialValues={{
          type: "RAW_MATERIAL",
          stock: "",
          cost: "",
          salePrice: "",
          status: "ACTIVE",
          warehouseId: getDefaultWarehouseId(),
          ...defaultValues,
        }}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitError={error}
        submitField={field}
      />
    </Modal>
  );
};

export default ProductFormModal;
