import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { translateText } from "../../../../localization/i18n";

import {
  Button,
  Card,
  CreatableSelect,
  Input,
  Switch,
  Textarea,
} from "../../../../shared/ui";

import {
  createStoredProduct,
  getStoredProducts,
} from "../../../products/utils/productsStorage";

import { formatManufacturingMoney } from "../../utils/manufacturingHelpers";
import { focusFirstInvalidField } from "../../../../shared/utils/formFocus";
import { aggregateQuantities } from "../../../../shared/utils/units";
import { formatProductionQuantity } from "../../production-orders/utils/productionOrderHelpers";

import "./BomForm.scss";

const createEmptyMaterial = () => ({
  id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: "",
  quantity: "",
});

const BomForm = ({ initialValues, onSubmit, onCancel }) => {
  const [productList, setProductList] = useState(() => getStoredProducts());

  const products = productList;

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

  const materialSummary = useMemo(
    () =>
      aggregateQuantities(
        preparedMaterials.map((material) => ({
          quantity: material.quantity,
          unit: material.product?.unit || material.unit,
        })),
        "quantity",
      ),
    [preparedMaterials],
  );

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
      nextErrors.name = translateText("Retsept nomini kiriting.");
    }

    if (!productId) {
      nextErrors.product = translateText("Tayyor mahsulotni tanlang.");
    }

    if (Number(outputQuantity) <= 0) {
      nextErrors.output = translateText(
        "Chiqish miqdori 0 dan katta bo‘lishi kerak.",
      );
    }

    const invalidMaterial = materials.some(
      (material) => !material.productId || Number(material.quantity) <= 0,
    );

    if (invalidMaterial) {
      nextErrors.materials = translateText(
        "Xomashyo va miqdorlarni tekshiring.",
      );
    }

    const ids = materials.map((material) => material.productId).filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      nextErrors.materials = translateText(
        "Bir xil xomashyoni retsept ichida ikki marta qo‘shib bo‘lmaydi.",
      );
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField();
    }

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
      unit: selectedProduct?.unit || "dona",
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
            <h3>{translateText("Retsept ma’lumotlari")}</h3>

            <p>
              {translateText(
                "Qaysi mahsulot va qancha miqdorda ishlab chiqishini belgilang.",
              )}
            </p>
          </div>
        </div>

        <div className="bom-form__grid">
          <Input
            label={translateText("Retsept nomi")}
            value={name}
            placeholder={translateText("Masalan: Shokoladli pechenye retsepti")}
            error={errors.name}
            onChange={(event) => setName(event.target.value)}
          />

          <CreatableSelect
            label={translateText("Natijada olinadigan mahsulot")}
            value={productId}
            placeholder={translateText(
              "Mahsulotni tanlang yoki yangi nom yozing",
            )}
            options={finishedProductOptions}
            error={errors.product}
            onChange={(event) => setProductId(event.target.value)}
            onCreate={async (newName) => {
              const created = await createStoredProduct(
                {
                  name: newName,
                  type: "FINISHED_GOOD",
                  unit: "dona",
                  stock: 0,
                  cost: 0,
                  salePrice: null,
                  status: "ACTIVE",
                },
                {
                  inlineModule: "manufacturing",
                },
              );

              setProductList((current) => [
                created,
                ...current.filter((item) => item.id !== created.id),
              ]);

              setProductId(created.id);

              return created;
            }}
          />

          <p className="bom-form__helper">
            {translateText(
              "Ushbu retsept bo‘yicha ishlab chiqariladigan mahsulotni tanlang yoki yarating.",
            )}
          </p>

          <Input
            label={translateText("Chiqish miqdori")}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={outputQuantity}
            placeholder="100"
            error={errors.output}
            onChange={(event) => setOutputQuantity(event.target.value)}
          />

          <Input
            label={translateText("Versiya")}
            value={version}
            placeholder="1.0"
            onChange={(event) => setVersion(event.target.value)}
          />

          <Switch
            checked={status}
            label={translateText("Retsept faol")}
            description={translateText(
              "Faol retsept ishlab chiqarish buyurtmasida tanlanishi mumkin.",
            )}
            onChange={(event) => setStatus(event.target.checked)}
          />
        </div>
      </Card>

      <Card padding="lg" className="bom-form__section">
        <div className="bom-form__section-header">
          <div>
            <h3>{translateText("Xomashyolar")}</h3>

            <p>
              {translateText(
                "Bitta ishlab chiqarish batch’i uchun kerakli materiallar.",
              )}
            </p>
          </div>
        </div>

        <div className="bom-form__materials">
          {preparedMaterials.map((material, index) => (
            <div key={material.id} className="bom-form__material">
              <div className="bom-form__material-number">{index + 1}</div>

              <CreatableSelect
                label={translateText("Xomashyo")}
                value={material.productId}
                placeholder={translateText("Tanlang yoki yangi nom yozing")}
                options={materialOptions}
                onChange={(event) =>
                  handleMaterialChange(
                    material.id,
                    "productId",
                    event.target.value,
                  )
                }
                onCreate={async (newName) => {
                  const created = await createStoredProduct(
                    {
                      name: newName,
                      type: "RAW_MATERIAL",
                      unit: "dona",
                      stock: 0,
                      cost: 0,
                      salePrice: null,
                      status: "ACTIVE",
                    },
                    {
                      inlineModule: "manufacturing",
                    },
                  );

                  setProductList((current) => [
                    created,
                    ...current.filter((item) => item.id !== created.id),
                  ]);

                  handleMaterialChange(material.id, "productId", created.id);

                  return created;
                }}
              />

              <Input
                label={translateText("Miqdor")}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
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
                label={translateText("Birlik")}
                value={material.product?.unit || "—"}
                disabled
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

        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={handleAddMaterial}
        >
          {translateText("Xomashyo qo‘shish")}
        </Button>
      </Card>

      <div className="bom-form__bottom-grid">
        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>{translateText("Tannarx preview")}</h3>

              <p>
                {translateText(
                  "Hozirgi mahsulotlar tannarxlari asosida hisoblanadi.",
                )}
              </p>
            </div>
          </div>

          <div className="bom-form__cost-summary">
            <CostRow
              label={translateText("Xomashyo tannarxi")}
              value={formatManufacturingMoney(materialCost)}
            />

            {materialSummary.map((summary) => (
              <CostRow
                key={summary.dimension}
                label={translateText(
                  summary.dimension === "WEIGHT"
                    ? "Jami massa"
                    : summary.dimension === "VOLUME"
                      ? "Jami hajm"
                      : summary.dimension === "LENGTH"
                        ? "Jami uzunlik"
                        : "Jami dona",
                )}
                value={`${formatProductionQuantity(summary.value)} ${summary.unit}`}
              />
            ))}

            <CostRow
              label={translateText("Chiqish")}
              value={`${Number(outputQuantity || 0)} ${
                selectedProduct?.unit || ""
              }`}
            />

            <CostRow
              label={translateText("1 birlik tannarx")}
              value={formatManufacturingMoney(unitCost)}
              strong
            />
          </div>
        </Card>

        <Card padding="lg" className="bom-form__section">
          <div className="bom-form__section-header">
            <div>
              <h3>{translateText("Izoh")}</h3>

              <p>{translateText("Retsept bo‘yicha ichki ma’lumot.")}</p>
            </div>
          </div>

          <Textarea
            label={translateText("Izoh")}
            value={note}
            placeholder={translateText(
              "Masalan: standart ishlab chiqarish retsepti...",
            )}
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      </div>

      <div className="bom-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {translateText("Bekor qilish")}
        </Button>

        <Button type="submit">
          {translateText(
            initialValues ? "O‘zgarishlarni saqlash" : "Retsept yaratish",
          )}
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
