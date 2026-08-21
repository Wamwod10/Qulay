import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { translateText } from "../../../../localization/i18n";
import {
  Button,
  Card,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../../../shared/ui";
import { focusFirstInvalidField } from "../../../../shared/utils/formFocus";
import {
  aggregateQuantities,
  convertQuantity,
  normalizeUnit,
  UNIT_OPTIONS,
} from "../../../../shared/utils/units";
import ProductFormModal from "../../../products/components/ProductFormModal/ProductFormModal";
import { getStoredProducts } from "../../../products/utils/productsStorage";
import { formatManufacturingMoney } from "../../utils/manufacturingHelpers";

import "./BomForm.scss";

const createEmptyMaterial = () => ({
  id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: "",
  quantity: "",
  unit: "",
});

const getCompatibleUnitOptions = (unit) => {
  try {
    const normalized = normalizeUnit(unit);
    const dimension = UNIT_OPTIONS.find((option) => option.value === normalized)?.dimension;
    return UNIT_OPTIONS.filter((option) => option.dimension === dimension);
  } catch {
    return [];
  }
};

const getConvertedUnitCost = (product, unit) => {
  if (!product || !unit) return 0;
  try {
    return Number(product.cost || 0) * convertQuantity(1, unit, product.unit);
  } catch {
    return Number(product.cost || 0);
  }
};

const BomForm = ({ initialValues, onSubmit, onCancel, submitError = "" }) => {
  const [productList, setProductList] = useState(() => getStoredProducts());
  const [name, setName] = useState(initialValues?.name || "");
  const [productId, setProductId] = useState(initialValues?.productId || initialValues?.outputProductId || "");
  const [outputQuantity, setOutputQuantity] = useState(initialValues?.outputQuantity || "");
  const [version, setVersion] = useState(initialValues?.version || "1");
  const [status, setStatus] = useState(initialValues ? initialValues.status === "ACTIVE" : true);
  const [normalWastePercent, setNormalWastePercent] = useState(initialValues?.normalWastePercent ?? "");
  const [note, setNote] = useState(initialValues?.note || "");
  const [materials, setMaterials] = useState(
    initialValues?.materials?.length
      ? initialValues.materials.map((material) => ({
        id: material.id || `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: material.productId,
        quantity: material.quantity,
        unit: material.unit || "",
      }))
      : [createEmptyMaterial()],
  );
  const [errors, setErrors] = useState({});
  const [productModal, setProductModal] = useState(null);

  const finishedProducts = useMemo(
    () => productList.filter((product) => product.status === "ACTIVE" && ["FINISHED_GOOD", "SEMI_FINISHED"].includes(product.type)),
    [productList],
  );
  const rawMaterials = useMemo(
    () => productList.filter((product) => product.status === "ACTIVE" && ["RAW_MATERIAL", "SEMI_FINISHED"].includes(product.type)),
    [productList],
  );
  const selectedProduct = finishedProducts.find((product) => product.id === productId);

  const productOptions = finishedProducts.map((product) => ({
    value: product.id,
    label: `${product.name} - ${product.sku || "SKU yo'q"} (${product.unit})`,
  }));
  const materialOptions = rawMaterials.map((product) => ({
    value: product.id,
    label: `${product.name} - ${product.sku || "SKU yo'q"} (${product.unit})`,
  }));

  const preparedMaterials = useMemo(
    () => materials.map((material) => {
      const product = rawMaterials.find((item) => item.id === material.productId);
      const unit = product?.unit ? normalizeUnit(material.unit || product.unit) : "";
      const quantity = Number(material.quantity || 0);
      const cost = getConvertedUnitCost(product, unit);
      return {
        ...material,
        product,
        unit,
        quantity,
        cost,
        total: quantity * cost,
      };
    }),
    [materials, rawMaterials],
  );

  const materialCost = preparedMaterials.reduce((total, item) => total + Number(item.total || 0), 0);
  const output = Number(outputQuantity || 0);
  const unitCost = output > 0 ? materialCost / output : 0;
  const materialSummary = useMemo(
    () => aggregateQuantities(preparedMaterials.filter((material) => material.unit).map((material) => ({
      quantity: material.quantity,
      unit: material.unit,
    })), "quantity"),
    [preparedMaterials],
  );

  const handleAddMaterial = () => setMaterials((current) => [...current, createEmptyMaterial()]);
  const handleRemoveMaterial = (materialId) => {
    if (materials.length > 1) setMaterials((current) => current.filter((material) => material.id !== materialId));
  };
  const handleMaterialChange = (materialId, field, value) => {
    setMaterials((current) => current.map((material) => material.id === materialId ? { ...material, [field]: value } : material));
  };
  const handleMaterialProductChange = (materialId, value) => {
    const product = rawMaterials.find((item) => item.id === value);
    setMaterials((current) => current.map((material) => material.id === materialId ? { ...material, productId: value, unit: product?.unit || "" } : material));
  };
  const handleProductCreated = (created) => {
    setProductList((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    if (productModal?.kind === "output") setProductId(created.id);
    if (productModal?.kind === "material") handleMaterialProductChange(productModal.materialId, created.id);
  };

  const validate = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = translateText("Retsept nomini kiriting.");
    if (!productId) nextErrors.product = translateText("Tayyor mahsulotni tanlang.");
    if (Number(outputQuantity) <= 0) nextErrors.output = translateText("Chiqish miqdori 0 dan katta bo'lishi kerak.");

    const invalidMaterial = preparedMaterials.some((material) => {
      if (!material.productId || !material.product || Number(material.quantity) <= 0 || !material.unit) return true;
      try {
        convertQuantity(material.quantity, material.unit, material.product.unit);
        return false;
      } catch {
        return true;
      }
    });
    if (invalidMaterial) nextErrors.materials = translateText("Xomashyo, miqdor va birliklarni tekshiring.");

    const ids = materials.map((material) => material.productId).filter(Boolean);
    if (new Set(ids).size !== ids.length) nextErrors.materials = translateText("Bir xil xomashyoni retsept ichida ikki marta qo'shib bo'lmaydi.");

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) focusFirstInvalidField();
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit?.({
      id: initialValues?.id,
      name: name.trim(),
      productId,
      outputProductId: productId,
      productName: selectedProduct?.name || "",
      outputProductName: selectedProduct?.name || "",
      outputQuantity: Number(outputQuantity),
      unit: selectedProduct?.unit || "",
      version: version.trim() || "1",
      status: status ? "ACTIVE" : "INACTIVE",
      normalWastePercent: normalWastePercent === "" ? null : Number(normalWastePercent),
      materials: preparedMaterials.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: Number(item.quantity),
        unit: item.unit,
        cost: Number(item.cost || 0),
      })),
      note: note.trim(),
    });
  };

  return (
    <form className="bom-form" onSubmit={handleSubmit}>
      {submitError && <div className="bom-form__error">{submitError}</div>}

      <Card padding="lg" className="bom-form__section">
        <div className="bom-form__section-header">
          <div>
            <h3>{translateText("Retsept ma'lumotlari")}</h3>
            <p>{translateText("Qaysi mahsulot va qancha miqdorda ishlab chiqishini belgilang.")}</p>
          </div>
        </div>

        <div className="bom-form__grid">
          <Input
            label={translateText("Retsept nomi")}
            value={name}
            placeholder={translateText("Masalan: Powder v1")}
            error={errors.name}
            onChange={(event) => setName(event.target.value)}
          />

          <Select
            label={translateText("Natijada olinadigan mahsulot")}
            value={productId}
            placeholder={translateText("Mahsulotni tanlang")}
            options={productOptions}
            error={errors.product}
            onChange={(event) => setProductId(event.target.value)}
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() => setProductModal({ kind: "output" })}
          >
            {translateText("+ Yangi mahsulot qo'shish")}
          </Button>

          <Input
            label={translateText("Chiqish miqdori")}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={outputQuantity}
            placeholder="20"
            error={errors.output}
            onChange={(event) => setOutputQuantity(event.target.value)}
          />

          <Input label={translateText("Chiqish birligi")} value={selectedProduct?.unit || "-"} disabled />
          <Input label={translateText("Versiya")} value={version} placeholder="1" onChange={(event) => setVersion(event.target.value)} />
          <Input
            label={translateText("Normal chiqindi %")}
            type="number"
            min="0"
            step="any"
            value={normalWastePercent}
            onChange={(event) => setNormalWastePercent(event.target.value)}
          />
          <Switch
            checked={status}
            label={translateText("Retsept faol")}
            description={translateText("Faol retsept ishlab chiqarish buyurtmasida tanlanishi mumkin.")}
            onChange={(event) => setStatus(event.target.checked)}
          />
        </div>
      </Card>

      <Card padding="lg" className="bom-form__section">
        <div className="bom-form__section-header">
          <div>
            <h3>{translateText("Xomashyolar")}</h3>
            <p>{translateText("Bitta ishlab chiqarish batch'i uchun kerakli materiallar.")}</p>
          </div>
        </div>

        <div className="bom-form__materials">
          {preparedMaterials.map((material) => (
            <div key={material.id} className="bom-form__material">
              <div className="bom-form__material-product">
                <Select
                  label={translateText("Xomashyo")}
                  value={material.productId}
                  placeholder={translateText("Xomashyoni tanlang")}
                  options={materialOptions}
                  onChange={(event) => handleMaterialProductChange(material.id, event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bom-form__material-create"
                  leftIcon={<Plus size={15} />}
                  onClick={() => setProductModal({ kind: "material", materialId: material.id })}
                >
                  {translateText("Yangi")}
                </Button>
                {material.product?.sku && <span>SKU: {material.product.sku}</span>}
              </div>
              <Input
                label={translateText("Miqdor")}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={material.quantity || ""}
                placeholder="0"
                onChange={(event) => handleMaterialChange(material.id, "quantity", event.target.value)}
              />
              <Select
                label={translateText("Birlik")}
                value={material.unit || material.product?.unit || ""}
                placeholder={material.product ? translateText("Birlik") : "-"}
                disabled={!material.product}
                options={getCompatibleUnitOptions(material.product?.unit)}
                onChange={(event) => handleMaterialChange(material.id, "unit", event.target.value)}
              />
              <div className="bom-form__material-cost">
                <span>{translateText("Tannarx")}</span>
                <strong>{formatManufacturingMoney(material.cost)}</strong>
              </div>
              <div className="bom-form__material-cost">
                <span>{translateText("Jami")}</span>
                <strong>{formatManufacturingMoney(material.total)}</strong>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title={translateText("Olib tashlash")}
                aria-label={translateText("Xomashyoni olib tashlash")}
                className="bom-form__material-delete"
                disabled={materials.length <= 1}
                onClick={() => handleRemoveMaterial(material.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>

        {errors.materials && <div className="bom-form__error">{errors.materials}</div>}
        <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={handleAddMaterial}>
          {translateText("Xomashyo qo'shish")}
        </Button>
      </Card>

      <div className="bom-form__bottom-grid">
        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>{translateText("Tannarx preview")}</h3>
              <p>{translateText("Hozirgi mahsulotlar tannarxlari asosida hisoblanadi.")}</p>
            </div>
          </div>
          <div className="bom-form__cost-summary">
            <CostRow label={translateText("Xomashyo tannarxi")} value={formatManufacturingMoney(materialCost)} />
            <CostRow label={translateText("Chiqish")} value={`${Number(outputQuantity || 0)} ${selectedProduct?.unit || ""}`} />
            <CostRow label={translateText("1 birlik tannarx")} value={formatManufacturingMoney(unitCost)} strong />
            {materialSummary.map((item) => (
              <CostRow key={item.dimension} label={translateText(item.dimension === "WEIGHT" ? "Jami massa" : item.dimension === "VOLUME" ? "Jami hajm" : item.dimension === "LENGTH" ? "Jami uzunlik" : "Jami dona")} value={`${item.value} ${item.unit}`} />
            ))}
          </div>
        </Card>

        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>{translateText("Izoh")}</h3>
              <p>{translateText("Retsept bo'yicha ichki ma'lumot.")}</p>
            </div>
          </div>
          <Textarea
            label={translateText("Izoh")}
            value={note}
            placeholder={translateText("Masalan: standart ishlab chiqarish retsepti...")}
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      </div>

      <div className="bom-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {translateText("Bekor qilish")}
        </Button>
        <Button type="submit">
          {translateText(initialValues ? "O'zgarishlarni saqlash" : "Retsept yaratish")}
        </Button>
      </div>

      <ProductFormModal
        open={Boolean(productModal)}
        title={productModal?.kind === "output" ? "Yangi tayyor mahsulot qo'shish" : "Yangi xomashyo qo'shish"}
        defaultValues={{
          type: productModal?.kind === "output" ? "FINISHED_GOOD" : "RAW_MATERIAL",
          unit: "",
        }}
        inlineModule="manufacturing"
        onCreated={handleProductCreated}
        onClose={() => setProductModal(null)}
      />
    </form>
  );
};

const CostRow = ({ label, value, strong }) => (
  <div className="bom-form__cost-row">
    <span>{label}</span>
    <strong className={strong ? "bom-form__cost-row-value--strong" : ""}>{value}</strong>
  </div>
);

export default BomForm;
