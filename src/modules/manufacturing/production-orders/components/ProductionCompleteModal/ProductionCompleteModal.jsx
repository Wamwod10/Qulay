import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

import {
  Button,
  Input,
  LiveIcon,
  Modal,
  Select,
  Textarea,
} from "../../../../../shared/ui";

import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import { getStoredProducts } from "../../../../products/utils/productsStorage";
import { convertQuantity, normalizeUnit } from "../../../../../shared/utils/units";
import { translateText } from "../../../../../localization/i18n";

import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  calculateOverheadCost,
} from "../../../utils/productionCost";

import "./ProductionCompleteModal.scss";

const ProductionCompleteModal = ({ open, order, onClose, onSubmit }) => {
  const [defectQuantity, setDefectQuantity] = useState("0");

  const [wasteQuantity, setWasteQuantity] = useState("0");

  const [actualMaterials, setActualMaterials] = useState([]);

  const [packagingRows, setPackagingRows] = useState([]);

  const packagingProducts = useMemo(() => getStoredProducts().filter((product) => product.status !== "INACTIVE"), []);
  const packagedProductOptions = useMemo(
    () =>
      packagingProducts
        .filter((product) => product.type === "FINISHED_GOOD" && normalizeUnit(product.unit) === "dona")
        .map((product) => ({ value: product.id, label: `${product.name} (${product.sku || "SKU"})` })),
    [packagingProducts],
  );

  const [completionNote, setCompletionNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !order) {
      return;
    }

    setDefectQuantity(String(order.qualityControl?.defectQuantity ?? 0));

    setWasteQuantity("0");

    setActualMaterials(
      (order.requiredMaterials || []).map((material) => ({
        productId: material.productId,

        productName: material.productName,

        unit: material.unit,

        plannedQuantity: Number(material.requiredQuantity || 0),

        actualQuantity: Number(material.requiredQuantity || 0),

        cost: Number(material.cost || 0),
      })),
    );

    setCompletionNote("");
    setPackagingRows(Array.isArray(order.packaging) ? order.packaging : []);
    setError("");
  }, [open, order]);

  const actualMaterialCost = useMemo(
    () => {
      const rawMaterialCost = actualMaterials.reduce(
        (total, material) =>
          total +
          Number(material.actualQuantity || 0) * Number(material.cost || 0),
        0,
      );
      const packagingMaterialCost = packagingRows.reduce(
        (total, row) => total + (row.materials || []).reduce(
          (rowTotal, material) => rowTotal + Number(material.quantity || 0) * Number(row.quantity || 0) * Number(packagingProducts.find((product) => product.id === material.productId)?.cost || 0),
          0,
        ),
        0,
      );
      return rawMaterialCost + packagingMaterialCost;
    },
    [actualMaterials, packagingProducts, packagingRows],
  );

  if (!order) {
    return null;
  }

  const plannedQuantity = Number(order.plannedQuantity || 0);

  const qualityAcceptedQuantity =
    order.qualityControl?.acceptedQuantity !== undefined &&
    order.qualityControl?.acceptedQuantity !== null
      ? Number(order.qualityControl.acceptedQuantity)
      : null;

  const defect = Number(defectQuantity || 0);

  const waste = Number(wasteQuantity || 0);

  const packagingTotal = packagingRows.reduce((total, row) => {
    const quantity = Number(row.quantity || 0);
    const packSize = Number(row.packSize || 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(packSize)) return total;

    try {
      return total + quantity * convertQuantity(packSize, row.packUnit || order.unit, order.unit);
    } catch {
      return total;
    }
  }, 0);

  const produced =
    qualityAcceptedQuantity !== null
      ? Math.max(qualityAcceptedQuantity - waste, 0)
      : Math.max(plannedQuantity - defect - waste, 0);

  const planDifference = produced - plannedQuantity;

  const overheadCost = calculateOverheadCost(order.overheadItems);

  const actualProductionCost = calculateActualProductionCost({
    actualMaterialCost,
    overheadCost,
  });

  const actualUnitCost = calculateActualUnitCost({
    actualProductionCost,
    producedQuantity: produced,
  });

  const changeMaterial = (productId, value) => {
    setActualMaterials((current) =>
      current.map((material) =>
        material.productId === productId
          ? {
              ...material,

              actualQuantity: value,
            }
          : material,
      ),
    );
  };

  const updatePackaging = (index, key, value) => setPackagingRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const addPackaging = () => setPackagingRows((current) => [...current, { productName: "", quantity: "", packSize: "", packUnit: order.unit, materials: [] }]);
  const removePackaging = (index) => setPackagingRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  const updatePackagingMaterial = (rowIndex, key, value) => setPackagingRows((current) => current.map((row, index) => index === rowIndex ? { ...row, materials: [{ ...(row.materials?.[0] || {}), [key]: value }] } : row));

  const handleSubmit = async () => {
    setError("");

    if (!Number.isFinite(defect) || !Number.isFinite(waste) || defect < 0 || waste < 0) {
      setError("Brak va yo‘qotish miqdorini tekshiring.");

      return;
    }

    if (defect + waste > plannedQuantity) {
      setError("Brak va yo'qotish reja miqdoridan oshmasligi kerak.");

      return;
    }

    if (packagingTotal > produced) {
      setError("Qadoqlangan jami miqdor tayyor mahsulotdan oshmasligi kerak.");
      return;
    }

    const invalidMaterial = actualMaterials.some(
      (material) => !Number.isFinite(Number(material.actualQuantity)) || Number(material.actualQuantity) < 0,
    );

    if (invalidMaterial) {
      setError("Xomashyo sarfi manfiy bo‘lishi mumkin emas.");

      return;
    }

    const invalidPackaging = packagingRows.some((row) => {
      const count = Number(row.quantity);
      const size = Number(row.packSize);
      return !Number.isInteger(count) || count <= 0 || !Number.isFinite(size) || size <= 0;
    });

    if (invalidPackaging) {
      setError("Qadoq soni butun son, qadoq hajmi esa 0 dan katta bo'lishi kerak.");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit?.({
      producedQuantity: produced,

      defectQuantity: defect,

      wasteQuantity: waste,

      overheadCost,

      actualMaterials: actualMaterials.map((material) => ({
        productId: material.productId,

        actualQuantity: Number(material.actualQuantity || 0),
      })),

      completionNote,

        packaging: packagingRows.map((row) => ({
          ...row,
          packUnit: normalizeUnit(row.packUnit || order.unit),
          quantity: Number(row.quantity || 0),
          packSize: Number(row.packSize || 0),
        })),
      });
    } catch (submitError) {
      setError(submitError?.message || "Ishlab chiqarishni yakunlashda xatolik.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ishlab chiqarishni yakunlash"
      description={`${order.number} · ${order.productName}`}
      size="lg"
    >
      <div className="production-complete">
        <div className="production-complete__summary">
          <div>
            <span>Reja</span>

            <strong>
              {order.plannedQuantity} {order.unit}
            </strong>
          </div>

          <div>
            <span>Real</span>

            <strong>
              {produced} {order.unit}
            </strong>
          </div>

          <div>
            <span>Farq</span>

            <strong
              className={
                planDifference < 0
                  ? "production-complete__negative"
                  : planDifference > 0
                    ? "production-complete__positive"
                    : ""
              }
            >
              {planDifference > 0 ? "+" : ""}
              {planDifference} {order.unit}
            </strong>
          </div>
        </div>

        <div className="production-complete__result-grid">
          <Input
            label="Yaroqli tayyor mahsulot"
            type="number"
            min="0"
            step="any"
            value={produced}
            disabled
            hint="Brak va chiqindi asosida avtomatik hisoblanadi."
          />

          <Input
            label="Brak"
            type="number"
            min="0"
            step="any"
            value={defectQuantity}
            onChange={(event) => setDefectQuantity(event.target.value)}
          />

          <Input
            label="Yo‘qotish / chiqindi"
            type="number"
            min="0"
            step="any"
            value={wasteQuantity}
            onChange={(event) => setWasteQuantity(event.target.value)}
          />
        </div>

        <div className="production-complete__materials-title">
          <div>
            <h4>Real xomashyo sarfi</h4>

            <p>Rejadagi sarfni real ishlatilgan miqdor bilan solishtiring.</p>
          </div>
        </div>

        <div className="production-complete__packaging">
          <div className="production-complete__materials-title">
            <div>
              <h4>Qadoqlash</h4>
              <p>Qadoqlangan jami: {packagingTotal} {order.unit}; qolgan bulk: {Math.max(produced - packagingTotal, 0)} {order.unit}.</p>
            </div>
            <Button variant="secondary" onClick={addPackaging} leftIcon={<Plus size={15} />}>Qadoq qo'shish</Button>
          </div>
          {packagingRows.map((row, index) => (
            <div className="production-complete__package-row" key={row.id || index}>
              <Input label="SKU nomi" value={row.productName || ""} onChange={(event) => updatePackaging(index, "productName", event.target.value)} />
              <Select label="Tayyor SKU (ixtiyoriy)" value={row.productId || ""} options={packagedProductOptions} onChange={(event) => updatePackaging(index, "productId", event.target.value)} />
              <Input label="Soni" type="number" min="1" step="1" value={row.quantity || ""} onChange={(event) => updatePackaging(index, "quantity", event.target.value)} />
              <Input label={`Hajmi (${order.unit})`} type="number" min="0" step="any" value={row.packSize || ""} onChange={(event) => updatePackaging(index, "packSize", event.target.value)} />
              <Select label="Qop/material" value={row.materials?.[0]?.productId || ""} options={packagingProducts.map((product) => ({ value: product.id, label: `${product.name} (${product.unit})` }))} onChange={(event) => updatePackagingMaterial(index, "productId", event.target.value)} />
              <Input label={`Har bir qadoq materiali${packagingProducts.find((product) => product.id === row.materials?.[0]?.productId)?.unit ? ` (${packagingProducts.find((product) => product.id === row.materials?.[0]?.productId).unit})` : ""}`} type="number" min="0" step="any" value={row.materials?.[0]?.quantity || ""} onChange={(event) => updatePackagingMaterial(index, "quantity", event.target.value)} />
              <Button type="button" variant="ghost" aria-label="Qadoqni o'chirish" onClick={() => removePackaging(index)} leftIcon={<Trash2 size={15} />} />
            </div>
          ))}
        </div>

        <div className="production-complete__materials">
          <div className="production-complete__materials-header">
            <span>Xomashyo</span>

            <span>Reja</span>

            <span>Real sarf</span>

            <span>Farq</span>
          </div>

          {actualMaterials.map((material) => {
            const difference =
              Number(material.actualQuantity || 0) -
              Number(material.plannedQuantity || 0);
            const differencePercent = Number(material.plannedQuantity || 0) > 0 ? (difference / Number(material.plannedQuantity)) * 100 : 0;

            return (
              <div
                key={material.productId}
                className="production-complete__material"
              >
                <div>
                  <strong>{material.productName}</strong>

                  <span>
                    {formatManufacturingMoney(material.cost)} /{" "}
                    {material.unit}
                  </span>
                </div>

                <span>
                  {Number(material.plannedQuantity).toFixed(2)} {material.unit}
                </span>

                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={material.actualQuantity}
                  onChange={(event) =>
                    changeMaterial(material.productId, event.target.value)
                  }
                />

                <strong
                  className={
                    difference > 0
                      ? "production-complete__negative"
                      : difference < 0
                        ? "production-complete__positive"
                        : ""
                  }
                >
                  {difference > 0 ? "+" : ""}
                  {difference.toFixed(2)} {material.unit} ({differencePercent > 0 ? "+" : ""}{differencePercent.toFixed(2)}%)
                </strong>
              </div>
            );
          })}
        </div>

        <div className="production-complete__cost">
          <div>
            <span>Real xomashyo tannarxi</span>

            <strong>{formatManufacturingMoney(actualMaterialCost)}</strong>
          </div>

          <div>
            <span>Overhead</span>

            <strong>{formatManufacturingMoney(overheadCost)}</strong>
          </div>

          <div>
            <span>Jami real tannarx</span>

            <strong>{formatManufacturingMoney(actualProductionCost)}</strong>
          </div>

          <div>
            <span>1 birlik real tannarx</span>

            <strong>{formatManufacturingMoney(actualUnitCost)}</strong>
          </div>
        </div>

        {produced < Number(order.plannedQuantity || 0) && (
          <div className="production-complete__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            Rejalashtirilgandan kam mahsulot ishlab chiqarilgan.
          </div>
        )}

        {produced === Number(order.plannedQuantity || 0) && (
          <div className="production-complete__success">
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={17} />
            Ishlab chiqarish rejasi to‘liq bajarilgan.
          </div>
        )}

        <Textarea
          label="Yakuniy izoh"
          value={completionNote}
          placeholder="Masalan: ishlab chiqarish muvaffaqiyatli yakunlandi..."
          onChange={(event) => setCompletionNote(event.target.value)}
        />

        {error && <div className="production-complete__error">{translateText(error)}</div>}

        <div className="production-complete__actions">
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>

          <Button onClick={handleSubmit} loading={submitting}>Ishlab chiqarishni yakunlash</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionCompleteModal;
