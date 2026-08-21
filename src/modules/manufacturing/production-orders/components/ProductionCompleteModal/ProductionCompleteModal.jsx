import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import {
  Button,
  Input,
  LiveIcon,
  Modal,
  Select,
  Textarea,
} from "../../../../../shared/ui";
import { convertQuantity, normalizeUnit } from "../../../../../shared/utils/units";
import { getStoredProducts } from "../../../../products/utils/productsStorage";
import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  calculateOverheadCost,
} from "../../../utils/productionCost";

import "./ProductionCompleteModal.scss";

const ProductionCompleteModal = ({ open, order, onClose, onSubmit }) => {
  const [producedQuantity, setProducedQuantity] = useState("");
  const [acceptedQuantity, setAcceptedQuantity] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [wasteQuantity, setWasteQuantity] = useState("0");
  const [actualMaterials, setActualMaterials] = useState([]);
  const [packagingRows, setPackagingRows] = useState([]);
  const [completionNote, setCompletionNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const products = useMemo(() => getStoredProducts().filter((product) => product.status !== "INACTIVE"), []);
  const packagedProductOptions = useMemo(
    () => products
      .filter((product) => product.type === "FINISHED_GOOD" && normalizeUnit(product.unit) === "dona")
      .map((product) => ({ value: product.id, label: `${product.name} (${product.sku || "SKU"})` })),
    [products],
  );
  const packagingMaterialOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: `${product.name} (${product.unit})` })),
    [products],
  );

  useEffect(() => {
    if (!open || !order) return;
    const qc = order.qualityControl || {};
    const produced = qc.producedQuantity ?? order.producedQuantity ?? order.plannedQuantity ?? 0;
    const accepted = qc.acceptedQuantity ?? order.acceptedQuantity ?? produced;
    setProducedQuantity(String(produced));
    setAcceptedQuantity(String(accepted));
    setDefectQuantity(String(qc.defectQuantity ?? order.defectQuantity ?? 0));
    setWasteQuantity(String(qc.wasteQuantity ?? order.wasteQuantity ?? 0));
    setActualMaterials((order.requiredMaterials || []).map((material) => ({
      productId: material.productId,
      productName: material.productName,
      unit: material.unit,
      plannedQuantity: Number(material.requiredQuantity || material.plannedQuantity || 0),
      actualQuantity: Number(material.actualQuantity || material.requiredQuantity || material.plannedQuantity || 0),
      cost: Number(material.cost || 0),
    })));
    setPackagingRows(Array.isArray(order.packaging) ? order.packaging : []);
    setCompletionNote("");
    setError("");
  }, [open, order]);

  if (!order) return null;

  const produced = Number(producedQuantity || 0);
  const accepted = Number(acceptedQuantity || 0);
  const defect = Number(defectQuantity || 0);
  const waste = Number(wasteQuantity || 0);
  const packagingTotal = packagingRows.reduce((total, row) => {
    try {
      return total + Number(row.quantity || 0) * convertQuantity(Number(row.packSize || 0), row.packUnit || order.unit, order.unit);
    } catch {
      return total;
    }
  }, 0);
  const remainingBulk = Math.max(accepted - packagingTotal, 0);
  const rawMaterialCost = actualMaterials.reduce((total, material) => total + Number(material.actualQuantity || 0) * Number(material.cost || 0), 0);
  const packagingPreviewCost = packagingRows.reduce(
    (total, row) => total + (row.materials || []).reduce(
      (rowTotal, material) => rowTotal + Number(material.quantity || 0) * Number(row.quantity || 0) * Number(products.find((product) => product.id === material.productId)?.cost || 0),
      0,
    ),
    0,
  );
  const overheadCost = calculateOverheadCost(order.overheadItems);
  const actualProductionCost = calculateActualProductionCost({
    actualMaterialCost: rawMaterialCost + packagingPreviewCost,
    overheadCost,
  });
  const actualUnitCost = calculateActualUnitCost({
    actualProductionCost,
    producedQuantity: accepted,
  });
  const planDifference = accepted - Number(order.plannedQuantity || 0);

  const updateMaterial = (productId, value) => {
    setActualMaterials((current) => current.map((material) => material.productId === productId ? { ...material, actualQuantity: value } : material));
  };
  const updatePackaging = (index, key, value) => setPackagingRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const addPackaging = () => setPackagingRows((current) => [...current, { productName: "", quantity: "", packSize: "", packUnit: order.unit, materials: [] }]);
  const removePackaging = (index) => setPackagingRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  const updatePackagingMaterial = (rowIndex, key, value) => setPackagingRows((current) => current.map((row, index) => index === rowIndex ? { ...row, materials: [{ ...(row.materials?.[0] || {}), [key]: value }] } : row));

  const handleSubmit = async () => {
    setError("");
    if ([produced, accepted, defect, waste].some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Miqdorlar manfiy bo'lishi mumkin emas.");
      return;
    }
    if (packagingTotal > accepted) {
      setError("Qadoqlangan jami miqdor mavjud mahsulotdan oshmoqda.");
      return;
    }
    if (actualMaterials.some((material) => !Number.isFinite(Number(material.actualQuantity)) || Number(material.actualQuantity) < 0)) {
      setError("Xomashyo sarfi manfiy bo'lishi mumkin emas.");
      return;
    }
    if (packagingRows.some((row) => !Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0 || Number(row.packSize) <= 0)) {
      setError("Qadoq soni butun son, qadoq hajmi esa 0 dan katta bo'lishi kerak.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({
        producedQuantity: produced,
        acceptedQuantity: accepted,
        defectQuantity: defect,
        wasteQuantity: waste,
        overheadCost,
        actualMaterials: actualMaterials.map((material) => ({
          productId: material.productId,
          actualQuantity: Number(material.actualQuantity || 0),
          unit: material.unit,
        })),
        packaging: packagingRows.map((row) => ({
          ...row,
          packUnit: normalizeUnit(row.packUnit || order.unit),
          quantity: Number(row.quantity || 0),
          packSize: Number(row.packSize || 0),
        })),
        outputWarehouseId: order.outputWarehouseId,
        materialWarehouseId: order.materialWarehouseId,
        completionNote,
      });
    } catch (submitError) {
      setError(submitError?.message || "Ishlab chiqarishni yakunlashda xatolik.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ishlab chiqarishni yakunlash" description={`${order.number} - ${order.productName}`} size="lg">
      <div className="production-complete">
        <div className="production-complete__summary">
          <div><span>Reja</span><strong>{order.plannedQuantity} {order.unit}</strong></div>
          <div><span>Accepted</span><strong>{accepted} {order.unit}</strong></div>
          <div>
            <span>Farq</span>
            <strong className={planDifference < 0 ? "production-complete__negative" : planDifference > 0 ? "production-complete__positive" : ""}>
              {planDifference > 0 ? "+" : ""}{planDifference} {order.unit}
            </strong>
          </div>
        </div>

        <div className="production-complete__result-grid">
          <Input label={`Produced (${order.unit})`} type="number" min="0" step="any" value={producedQuantity} onChange={(event) => setProducedQuantity(event.target.value)} />
          <Input label={`Accepted (${order.unit})`} type="number" min="0" step="any" value={acceptedQuantity} onChange={(event) => setAcceptedQuantity(event.target.value)} />
          <Input label={`Defect (${order.unit})`} type="number" min="0" step="any" value={defectQuantity} onChange={(event) => setDefectQuantity(event.target.value)} />
          <Input label={`Waste (${order.unit})`} type="number" min="0" step="any" value={wasteQuantity} onChange={(event) => setWasteQuantity(event.target.value)} />
        </div>

        <div className="production-complete__packaging">
          <div className="production-complete__materials-title">
            <div>
              <h4>Qadoqlash</h4>
              <p>Qadoqlangan jami: {packagingTotal} {order.unit}; qolgan bulk: {remainingBulk} {order.unit}.</p>
            </div>
            <Button type="button" variant="secondary" onClick={addPackaging} leftIcon={<Plus size={15} />}>Qadoq qo'shish</Button>
          </div>
          {packagingRows.map((row, index) => (
            <div className="production-complete__package-row" key={row.id || index}>
              <Input label="SKU nomi" value={row.productName || ""} onChange={(event) => updatePackaging(index, "productName", event.target.value)} />
              <Select label="Tayyor SKU" value={row.productId || ""} options={packagedProductOptions} onChange={(event) => updatePackaging(index, "productId", event.target.value)} />
              <Input label="Soni" type="number" min="1" step="1" value={row.quantity || ""} onChange={(event) => updatePackaging(index, "quantity", event.target.value)} />
              <Input label={`Hajmi (${order.unit})`} type="number" min="0" step="any" value={row.packSize || ""} onChange={(event) => updatePackaging(index, "packSize", event.target.value)} />
              <Select label="Qadoq materiali" value={row.materials?.[0]?.productId || ""} options={packagingMaterialOptions} onChange={(event) => updatePackagingMaterial(index, "productId", event.target.value)} />
              <Input label="Har bir qadoqqa material" type="number" min="0" step="any" value={row.materials?.[0]?.quantity || ""} onChange={(event) => updatePackagingMaterial(index, "quantity", event.target.value)} />
              <Button type="button" variant="ghost" aria-label="Qadoqni o'chirish" onClick={() => removePackaging(index)} leftIcon={<Trash2 size={15} />} />
            </div>
          ))}
        </div>

        <div className="production-complete__materials">
          <div className="production-complete__materials-header">
            <span>Xomashyo</span><span>Reja</span><span>Real sarf</span><span>Farq</span>
          </div>
          {actualMaterials.map((material) => {
            const difference = Number(material.actualQuantity || 0) - Number(material.plannedQuantity || 0);
            const differencePercent = Number(material.plannedQuantity || 0) > 0 ? (difference / Number(material.plannedQuantity)) * 100 : 0;
            return (
              <div key={material.productId} className="production-complete__material">
                <div><strong>{material.productName}</strong><span>{formatManufacturingMoney(material.cost)} / {material.unit}</span></div>
                <span>{Number(material.plannedQuantity).toFixed(2)} {material.unit}</span>
                <Input type="number" min="0" step="any" value={material.actualQuantity} onChange={(event) => updateMaterial(material.productId, event.target.value)} />
                <strong className={difference > 0 ? "production-complete__negative" : difference < 0 ? "production-complete__positive" : ""}>
                  {difference > 0 ? "+" : ""}{difference.toFixed(2)} {material.unit} ({differencePercent > 0 ? "+" : ""}{differencePercent.toFixed(2)}%)
                </strong>
              </div>
            );
          })}
        </div>

        <div className="production-complete__cost">
          <div><span>Xomashyo</span><strong>{formatManufacturingMoney(rawMaterialCost)}</strong></div>
          <div><span>Qadoqlash materiali</span><strong>{formatManufacturingMoney(packagingPreviewCost)}</strong></div>
          <div><span>Qo'shimcha xarajat</span><strong>{formatManufacturingMoney(overheadCost)}</strong></div>
          <div><span>Jami real tannarx</span><strong>{formatManufacturingMoney(actualProductionCost)}</strong></div>
          <div><span>1 birlik real tannarx</span><strong>{formatManufacturingMoney(actualUnitCost)}</strong></div>
        </div>

        {accepted < Number(order.plannedQuantity || 0) && (
          <div className="production-complete__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            Rejalashtirilgandan kam yaroqli mahsulot.
          </div>
        )}
        {accepted === Number(order.plannedQuantity || 0) && (
          <div className="production-complete__success">
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={17} />
            Ishlab chiqarish rejasi to'liq bajarilgan.
          </div>
        )}

        <Textarea label="Yakuniy izoh" value={completionNote} placeholder="Masalan: ishlab chiqarish muvaffaqiyatli yakunlandi..." onChange={(event) => setCompletionNote(event.target.value)} />
        {error && <div className="production-complete__error">{translateText(error)}</div>}

        <div className="production-complete__actions">
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} loading={submitting}>Ishlab chiqarishni yakunlash</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionCompleteModal;
