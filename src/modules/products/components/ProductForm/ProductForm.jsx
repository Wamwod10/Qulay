import { translateText } from "../../../../localization/i18n";import { useMemo, useRef, useState } from "react";

import { ImagePlus, Trash2 } from "lucide-react";

import { Button, CreatableSelect, Input, Select, Switch, Textarea } from "../../../../shared/ui";

import { PRODUCT_TYPES } from "../../constants/productTypes";
import { PRODUCT_CATEGORIES } from "../../constants/productCategories";
import { generateUniqueSku } from "../../utils/productsStorage";
import { getStoredSuppliers } from "../../../suppliers/utils/suppliersStorage";
import { createSupplier } from "../../../suppliers/utils/suppliersStorage";
import { createCategory, getStoredCategories } from "../../utils/categoriesStorage";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";
import { tenantGet, tenantSet } from "../../../auth/utils/tenantStorage";
import { UNIT_DEFINITIONS } from "../../../../shared/utils/units";
import { getPlatformSettings } from "../../../settings/utils/settingsStorage";
import { focusFirstInvalidField } from "../../../../shared/utils/formFocus";

import "./ProductForm.scss";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 800;
const IMAGE_QUALITY = 0.78;

const initialForm = {
  name: "",
  sku: "",
  barcode: "",
  type: "",
  category: "",
  brand: "",
  unit: tenantGet("last_product_unit", "dona"),
  warehouseId: "",
  stock: "",
  minimumStock: "",
  reorderPoint: "",
  expiryDate: "",
  normalWastePercent: "",
  cost: "",
  salePrice: "",
  supplierId: "",
  tax: "0",
  discount: "0",
  image: "",
  notes: "",
  status: true
};

const toFormValues = (initialValues) => {
  if (!initialValues) {
    return { ...initialForm, unit: tenantGet("last_product_unit", "dona"), tax: String(getPlatformSettings().defaults.vatRate ?? 0) };
  }

  return {
    ...initialForm,
    ...initialValues,
    category: initialValues.categoryId ?? initialValues.category ?? "",
    stock: initialValues.stock ?? "",
    minimumStock: initialValues.minimumStock ?? "",
    reorderPoint: initialValues.reorderPoint ?? "",
    expiryDate: initialValues.expiryDate ? String(initialValues.expiryDate).slice(0, 10) : "",
    normalWastePercent: initialValues.normalWastePercent ?? "",
    cost: initialValues.cost ?? "",
    salePrice: initialValues.salePrice ?? "",
    supplierId: initialValues.supplierId ?? "",
    warehouseId: initialValues.warehouseId ?? "",
    tax: initialValues.tax ?? 0,
    discount: initialValues.discount ?? 0,
    image: initialValues.image ?? "",
    notes: initialValues.notes ?? "",
    status: initialValues.status === "ACTIVE"
  };
};

const resizeImage = (file) =>
new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));

  reader.onload = () => {
    const image = new Image();

    image.onerror = () =>
    reject(new Error("Rasm formati qo'llab-quvvatlanmaydi."));

    image.onload = () => {
      const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / image.width,
        MAX_IMAGE_DIMENSION / image.height
      );
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");

      if (!context) {
        resolve(reader.result);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };

    image.src = reader.result;
  };

  reader.readAsDataURL(file);
});

const ProductForm = ({ initialValues, onSubmit, onCancel }) => {
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => toFormValues(initialValues));
  const [supplierList, setSupplierList] = useState(() => getStoredSuppliers().filter((supplier) => supplier.status === "ACTIVE"));
  const [categoryList, setCategoryList] = useState(() => getStoredCategories().filter((category) => category.status !== "INACTIVE"));
  const warehouses = useMemo(() => getStoredWarehouses().filter((warehouse) => warehouse.status === "ACTIVE"), []);

  const suppliers = supplierList;

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === form.supplierId),
    [suppliers, form.supplierId]
  );

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,

    label: supplier.name
  }));

  const categoryOptions = [
    ...PRODUCT_CATEGORIES,
    ...categoryList.map((category) => ({ value: category.id, label: category.name })),
  ].filter((option, index, all) => all.findIndex((item) => item.value === option.value) === index);
  const selectedCategory = categoryList.find((category) => category.id === form.category);
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }));

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "unit") tenantSet("last_product_unit", value);

    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        image: "Faqat rasm fayli tanlang."
      }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrors((current) => ({
        ...current,
        image: "Rasm hajmi 6 MB dan oshmasligi kerak."
      }));
      return;
    }

    try {
      const image = await resizeImage(file);

      handleChange("image", image);
    } catch {
      setErrors((current) => ({
        ...current,
        image: "Rasmni yuklab bo'lmadi."
      }));
    }
  };

  const validateNumber = (field, label, min = 0, max = null, nextErrors) => {
    const value = form[field];

    if (value === "") {
      return;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < min) {
      nextErrors[field] = `${label} ${min} dan kichik bo'lishi mumkin emas.`;
      return;
    }

    if (max !== null && parsedValue > max) {
      nextErrors[field] = `${label} ${max} dan katta bo'lishi mumkin emas.`;
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Mahsulot nomini kiriting.";
    }

    if (!form.type) {
      nextErrors.type = "Mahsulot turini tanlang.";
    }

    if (!form.unit) {
      nextErrors.unit = "O'lchov birligini tanlang.";
    }

    validateNumber("stock", "Qoldiq", 0, null, nextErrors);
    validateNumber("minimumStock", "Minimal qoldiq", 0, null, nextErrors);
    validateNumber("reorderPoint", "Qayta buyurtma nuqtasi", 0, null, nextErrors);
    validateNumber("normalWastePercent", "Normal chiqindi foizi", 0, 100, nextErrors);
    validateNumber("cost", "Tannarx", 0, null, nextErrors);
    if (form.type !== "RAW_MATERIAL") validateNumber("salePrice", "Sotuv narxi", 0, null, nextErrors);
    if (Number(form.stock || 0) > 0 && !form.warehouseId) nextErrors.warehouseId = "Boshlang'ich qoldiq uchun omborni tanlang.";
    validateNumber("tax", "QQS", 0, 100, nextErrors);
    validateNumber("discount", "Chegirma", 0, 100, nextErrors);

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) focusFirstInvalidField();

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const sku = form.sku.trim() || generateUniqueSku(initialValues?.id);

    const product = {
      id: initialValues?.id || `prd-${Date.now()}`,
      name: form.name.trim(),
      sku,
      barcode: form.barcode.trim(),
      type: form.type,
      category: selectedCategory?.name || form.category || null,
      categoryId: selectedCategory?.id || null,
      brand: form.brand.trim(),
      unit: form.unit,
      stock: Number(form.stock) || 0,
      minimumStock: Number(form.minimumStock) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
      expiryDate: form.expiryDate || null,
      normalWastePercent: form.normalWastePercent === "" ? null : Number(form.normalWastePercent),
      cost: Number(form.cost) || 0,
      salePrice: form.type === "RAW_MATERIAL" || form.salePrice === "" ? null : Number(form.salePrice),
      supplierId: form.supplierId || null,
      supplierName: selectedSupplier?.name || null,
      warehouseId: form.warehouseId || null,
      tax: Number(form.tax) || 0,
      discount: Number(form.discount) || 0,
      image: form.image || "",
      notes: form.notes.trim(),
      status: form.status ? "ACTIVE" : "INACTIVE"
    };

    onSubmit?.(product);
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <section className="product-form__section">
        <div className="product-form__section-header">
          <h3>{translateText("Mahsulot rasmi")}</h3>
          <p>{translateText("Mahsulotni tezroq tanish uchun rasm qo'shishingiz mumkin.")}</p>
        </div>

        <div className="product-form__image-area">
          <div className="product-form__image-preview">
            {form.image ?
            <img src={form.image} alt={form.name || translateText("Mahsulot")} /> :

            <ImagePlus size={30} strokeWidth={1.5} />
            }
          </div>

          <div className="product-form__image-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange} />
            

            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}>{translateText("Rasm tanlash")}


            </Button>

            {form.image &&
            <Button
              type="button"
              variant="danger"
              leftIcon={<Trash2 size={16} />}
              onClick={() => handleChange("image", "")}>{translateText("Olib tashlash")}


            </Button>
            }

            {errors.image &&
            <span className="product-form__error">{errors.image}</span>
            }
          </div>
        </div>
      </section>

      <section className="product-form__section">
        <div className="product-form__section-header">
          <h3>{translateText("Asosiy ma'lumotlar")}</h3>
          <p>{translateText("Mahsulotning nomi, turi, kategoriya va identifikatsiyasi.")}</p>
        </div>

        <div className="product-form__grid">
          <Input
            label={translateText("Mahsulot nomi")}
            placeholder={translateText("Masalan: Un Premium")}
            value={form.name}
            required
            error={errors.name}
            onChange={(event) => handleChange("name", event.target.value)} />
          

          <CreatableSelect
            label={translateText("Asosiy yetkazib beruvchi")}
            value={form.supplierId || ""}
            placeholder={translateText("Yetkazib beruvchi tanlang")}
            options={supplierOptions}
            onChange={(event) => handleChange("supplierId", event.target.value)}
            onCreate={async (name) => {
              const created = await createSupplier({ name });
              setSupplierList((current) => [created, ...current.filter((item) => item.id !== created.id)]);
              return created;
            }} />
          

          <Select
            label={translateText("Mahsulot turi")}
            placeholder={translateText("Turini tanlang")}
            value={form.type}
            options={PRODUCT_TYPES}
            required
            error={errors.type}
            onChange={(event) => handleChange("type", event.target.value)} />
          

          <CreatableSelect
            label={translateText("Kategoriya")}
            placeholder={translateText("Kategoriya tanlang")}
            value={form.category}
            options={categoryOptions}
            error={errors.category}
            onChange={(event) => handleChange("category", event.target.value)}
            onCreate={async (name) => {
              const created = await createCategory(name);
              setCategoryList((current) => [created, ...current.filter((item) => item.id !== created.id)]);
              return created;
            }} />
          

          <Input
            label={translateText("Brend")}
            placeholder={translateText("Masalan: Universal Foods")}
            value={form.brand}
            onChange={(event) => handleChange("brand", event.target.value)} />
          

          <Input
            label="SKU"
            placeholder={translateText("Masalan: 4821")}
            value={form.sku}
            onChange={(event) => handleChange("sku", event.target.value)} />
          

          <Input
            label={translateText("Shtrix-kod")}
            placeholder="4780012345000"
            value={form.barcode}
            onChange={(event) => handleChange("barcode", event.target.value)} />
          

          <Select
            label={translateText("O'lchov birligi")}
            value={form.unit}
            required
            error={errors.unit}
            options={Object.values(UNIT_DEFINITIONS).map((unit) => ({ value: unit.label, label: unit.label }))}
            onChange={(event) => handleChange("unit", event.target.value)} />
          

        </div>
      </section>

      <section className="product-form__section">
        <div className="product-form__section-header">
          <h3>{translateText("Ombor")}</h3>
          <p>{translateText("Mahsulotning boshlang'ich va minimal qoldiq chegarasi.")}</p>
        </div>

        <div className="product-form__grid">
          <Select
            label={translateText("Ombor")}
            value={form.warehouseId}
            placeholder={translateText("Ombor tanlang")}
            options={warehouseOptions}
            error={errors.warehouseId}
            onChange={(event) => handleChange("warehouseId", event.target.value)} />

          <Input
            label={translateText("Boshlang'ich qoldiq")}
            type="number"
            min="0"
            step="any"
            value={form.stock}
            error={errors.stock}
            onChange={(event) => handleChange("stock", event.target.value)} />
          

          <Input
            label={translateText("Minimal qoldiq")}
            type="number"
            min="0"
            step="any"
            value={form.minimumStock}
            error={errors.minimumStock}
            onChange={(event) =>
            handleChange("minimumStock", event.target.value)
            } />

          <Input
            label={translateText("Qayta buyurtma nuqtasi")}
            type="number"
            min="0"
            step="any"
            value={form.reorderPoint}
            error={errors.reorderPoint}
            onChange={(event) => handleChange("reorderPoint", event.target.value)} />

          <Input
            label={translateText("Yaroqlilik muddati")}
            type="date"
            value={form.expiryDate}
            onChange={(event) => handleChange("expiryDate", event.target.value)} />

          <Input
            label={translateText("Normal chiqindi (%)")}
            type="number"
            min="0"
            max="100"
            step="any"
            value={form.normalWastePercent}
            error={errors.normalWastePercent}
            onChange={(event) => handleChange("normalWastePercent", event.target.value)} />
          
        </div>
      </section>

      <section className="product-form__section">
        <div className="product-form__section-header">
          <h3>{translateText("Narx va soliq")}</h3>
          <p>{translateText("Tannarx, sotuv narxi, QQS va chegirmani belgilang.")}</p>
        </div>

        <div className="product-form__grid">
          <Input
            label={translateText("Tannarx")}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={form.cost}
            error={errors.cost}
            onChange={(event) => handleChange("cost", event.target.value)} />
          

          {form.type !== "RAW_MATERIAL" && <Input
            label={translateText("Sotuv narxi")}
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={form.salePrice}
            error={errors.salePrice}
            onChange={(event) => handleChange("salePrice", event.target.value)} />}
          

          <Input
            label={translateText("QQS (%)")}
            type="number"
            min="0"
            max="100"
            step="any"
            value={form.tax}
            error={errors.tax}
            onChange={(event) => handleChange("tax", event.target.value)} />
          

          <Input
            label={translateText("Chegirma (%)")}
            type="number"
            min="0"
            max="100"
            step="any"
            value={form.discount}
            error={errors.discount}
            onChange={(event) => handleChange("discount", event.target.value)} />
          
        </div>
      </section>

      <section className="product-form__section">
        <div className="product-form__section-header">
          <h3>{translateText("Qo'shimcha ma'lumot")}</h3>
          <p>{translateText("Mahsulot bo'yicha ichki izoh yoki muhim eslatmalar.")}</p>
        </div>

        <Textarea
          label={translateText("Izoh")}
          placeholder={translateText("Mahsulot haqida qo'shimcha ma'lumot...")}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)} />
        
      </section>

      <div className="product-form__status">
        <Switch
          checked={form.status}
          label={translateText("Mahsulot faol")}
          description={translateText("Faol mahsulot savdo, ombor va ishlab chiqarish jarayonlarida ishlatilishi mumkin.")}
          onChange={(event) => handleChange("status", event.target.checked)} />
        
      </div>

      <div className="product-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>{translateText("Bekor qilish")}

        </Button>

        <Button type="submit">
          {initialValues ? "O'zgarishlarni saqlash" : "Mahsulot yaratish"}
        </Button>
      </div>
    </form>);

};

export default ProductForm;
