import { useMemo, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../../../shared/ui";

import { getStoredProducts } from "../../../products/utils/productsStorage";

import { formatManufacturingMoney } from "../../utils/manufacturingHelpers";

import "./BomForm.scss";

const createEmptyMaterial = () => ({
  id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

  productId: "",
  quantity: "",
});

const BomForm = ({ initialValues, onSubmit, onCancel }) => {
  const products = useMemo(() => getStoredProducts(), []);

  const finishedProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.status === "ACTIVE" &&
          (product.type === "FINISHED_GOOD" ||
            product.type === "SEMI_FINISHED"),
      ),
    [products],
  );

  const rawMaterials = useMemo(
    () =>
      products.filter(
        (product) =>
          product.status === "ACTIVE" &&
          (product.type === "RAW_MATERIAL" || product.type === "SEMI_FINISHED"),
      ),
    [products],
  );

  const [name, setName] = useState(initialValues?.name || "");

  const [productId, setProductId] = useState(initialValues?.productId || "");

  const [outputQuantity, setOutputQuantity] = useState(
    initialValues?.outputQuantity || "",
  );

  const [version, setVersion] = useState(initialValues?.version || "1.0");

  const [status, setStatus] = useState(
    initialValues ? initialValues.status === "ACTIVE" : true,
  );

  const [note, setNote] = useState(initialValues?.note || "");

  const [materials, setMaterials] = useState(
    initialValues?.materials?.length
      ? initialValues.materials.map((material) => ({
          id:
            material.id ||
            `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

          productId: material.productId,

          quantity: material.quantity,
        }))
      : [createEmptyMaterial()],
  );

  const [errors, setErrors] = useState({});

  const selectedProduct = finishedProducts.find(
    (product) => product.id === productId,
  );

  const finishedProductOptions = finishedProducts.map((product) => ({
    value: product.id,
    label: `${product.name} · ${product.sku || "—"}`,
  }));

  const materialOptions = rawMaterials.map((product) => ({
    value: product.id,
    label: `${product.name} · ${product.sku || "—"}`,
  }));

  const preparedMaterials = useMemo(
    () =>
      materials.map((material) => {
        const product = rawMaterials.find(
          (item) => item.id === material.productId,
        );

        const quantity = Number(material.quantity || 0);

        const cost = Number(product?.cost || 0);

        return {
          ...material,

          product,

          quantity,

          cost,

          total: quantity * cost,
        };
      }),
    [materials, rawMaterials],
  );

  const materialCost = preparedMaterials.reduce(
    (total, item) => total + Number(item.total || 0),
    0,
  );

  const unitCost =
    Number(outputQuantity) > 0 ? materialCost / Number(outputQuantity) : 0;

  const handleAddMaterial = () => {
    setMaterials((current) => [...current, createEmptyMaterial()]);
  };

  const handleRemoveMaterial = (materialId) => {
    if (materials.length <= 1) {
      return;
    }

    setMaterials((current) =>
      current.filter((material) => material.id !== materialId),
    );
  };

  const handleMaterialChange = (materialId, field, value) => {
    setMaterials((current) =>
      current.map((material) =>
        material.id === materialId
          ? {
              ...material,
              [field]: value,
            }
          : material,
      ),
    );
  };

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = "BOM nomini kiriting.";
    }

    if (!productId) {
      nextErrors.product = "Tayyor mahsulotni tanlang.";
    }

    if (Number(outputQuantity) <= 0) {
      nextErrors.output = "Chiqish miqdori 0 dan katta bo‘lishi kerak.";
    }

    const invalidMaterial = materials.some(
      (material) => !material.productId || Number(material.quantity) <= 0,
    );

    if (invalidMaterial) {
      nextErrors.materials = "Xomashyo va miqdorlarni tekshiring.";
    }

    const ids = materials.map((material) => material.productId).filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      nextErrors.materials =
        "Bir xil xomashyoni BOM ichida ikki marta qo‘shib bo‘lmaydi.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const output = Number(outputQuantity);

    const prepared = preparedMaterials.map((item) => ({
      id: item.id,

      productId: item.product.id,

      productName: item.product.name,

      sku: item.product.sku,

      quantity: Number(item.quantity),

      unit: item.product.unit,

      cost: Number(item.product.cost || 0),
    }));

    onSubmit?.({
      id: initialValues?.id,

      name: name.trim(),

      productId,

      productName: selectedProduct?.name || "",

      outputQuantity: output,

      outputUnit: selectedProduct?.unit || "dona",

      version: version.trim() || "1.0",

      status: status ? "ACTIVE" : "INACTIVE",

      materials: prepared,

      note: note.trim(),
    });
  };

  return (
    <form className="bom-form" onSubmit={handleSubmit}>
      <Card padding="lg" className="bom-form__section">
        <div className="bom-form__section-header">
          <div>
            <h3>Retsept ma’lumotlari</h3>

            <p>
              Qaysi mahsulot va qancha miqdorda ishlab chiqishini belgilang.
            </p>
          </div>
        </div>

        <div className="bom-form__grid">
          <Input
            label="BOM / Retsept nomi"
            value={name}
            placeholder="Masalan: Shokoladli pechenye retsepti"
            error={errors.name}
            onChange={(event) => setName(event.target.value)}
          />

          <Select
            label="Tayyor mahsulot"
            value={productId}
            placeholder="Mahsulot tanlang"
            options={finishedProductOptions}
            error={errors.product}
            onChange={(event) => setProductId(event.target.value)}
          />

          <Input
            label="Chiqish miqdori"
            type="number"
            min="0"
            step="any"
            value={outputQuantity}
            placeholder="100"
            error={errors.output}
            onChange={(event) => setOutputQuantity(event.target.value)}
          />

          <Input label="Birlik" value={selectedProduct?.unit || "—"} disabled />

          <Input
            label="Versiya"
            value={version}
            placeholder="1.0"
            onChange={(event) => setVersion(event.target.value)}
          />

          <Switch
            checked={status}
            label="BOM faol"
            description="Faol BOM ishlab chiqarish buyurtmasida tanlanishi mumkin."
            onChange={(event) => setStatus(event.target.checked)}
          />
        </div>
      </Card>

      <Card padding="lg" className="bom-form__section">
        <div className="bom-form__section-header">
          <div>
            <h3>Xomashyolar</h3>

            <p>Bitta ishlab chiqarish batch’i uchun kerakli materiallar.</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleAddMaterial}
          >
            Xomashyo qo‘shish
          </Button>
        </div>

        <div className="bom-form__materials">
          {preparedMaterials.map((material, index) => (
            <div key={material.id} className="bom-form__material">
              <div className="bom-form__material-number">{index + 1}</div>

              <Select
                label="Xomashyo"
                value={material.productId}
                placeholder="Tanlang"
                options={materialOptions}
                onChange={(event) =>
                  handleMaterialChange(
                    material.id,
                    "productId",
                    event.target.value,
                  )
                }
              />

              <Input
                label="Miqdor"
                type="number"
                min="0"
                step="any"
                value={material.quantity || ""}
                placeholder="0"
                onChange={(event) =>
                  handleMaterialChange(
                    material.id,
                    "quantity",
                    event.target.value,
                  )
                }
              />

              <Input
                label="Birlik"
                value={material.product?.unit || "—"}
                disabled
              />

              <div className="bom-form__material-cost">
                <span>Tannarx</span>

                <strong>{formatManufacturingMoney(material.cost)} so‘m</strong>
              </div>

              <div className="bom-form__material-cost">
                <span>Jami</span>

                <strong>{formatManufacturingMoney(material.total)} so‘m</strong>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Olib tashlash"
                disabled={materials.length <= 1}
                onClick={() => handleRemoveMaterial(material.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>

        {errors.materials && (
          <div className="bom-form__error">{errors.materials}</div>
        )}
      </Card>

      <div className="bom-form__bottom-grid">
        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>Tannarx preview</h3>

              <p>Hozirgi Products tannarxlari asosida hisoblanadi.</p>
            </div>
          </div>

          <div className="bom-form__cost-summary">
            <CostRow
              label="Xomashyo tannarxi"
              value={`${formatManufacturingMoney(materialCost)} so‘m`}
            />

            <CostRow
              label="Chiqish"
              value={`${Number(outputQuantity || 0)} ${
                selectedProduct?.unit || ""
              }`}
            />

            <CostRow
              label="1 birlik tannarx"
              value={`${formatManufacturingMoney(unitCost)} so‘m`}
              strong
            />
          </div>
        </Card>

        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>Izoh</h3>

              <p>Retsept bo‘yicha ichki ma’lumot.</p>
            </div>
          </div>

          <Textarea
            label="Izoh"
            value={note}
            placeholder="Masalan: standart ishlab chiqarish retsepti..."
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      </div>

      <div className="bom-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Bekor qilish
        </Button>

        <Button type="submit">
          {initialValues ? "O‘zgarishlarni saqlash" : "BOM yaratish"}
        </Button>
      </div>
    </form>
  );
};

const CostRow = ({ label, value, strong }) => (
  <div className="bom-form__cost-row">
    <span>{label}</span>

    <strong className={strong ? "bom-form__cost-row-value--strong" : ""}>
      {value}
    </strong>
  </div>
);

export default BomForm;
