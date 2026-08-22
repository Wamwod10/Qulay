import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import { apiRequest, unwrapList } from "../../../../../services/api/apiClient";
import { Button, Input, LiveIcon, Modal, Textarea } from "../../../../../shared/ui";
import { convertQuantity, normalizeUnit } from "../../../../../shared/utils/units";
import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  calculateOverheadCost,
} from "../../../utils/productionCost";

import "./ProductionCompleteModal.scss";

const createPackagingRow = (order, row = {}) => ({
  id: row.id || `package-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  packSize: row.packSize ? String(row.packSize) : "",
  packUnit: row.packUnit || order.unit,
  quantity: row.quantity ? String(row.quantity) : "",
  materials: Array.isArray(row.materials || row.packagingMaterials) ? (row.materials || row.packagingMaterials) : [],
});

const ProductionCompleteModal = ({ open, order, onClose, onSubmit }) => {
  const [products, setProducts] = useState([]);
  const [producedQuantity, setProducedQuantity] = useState("");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [wasteQuantity, setWasteQuantity] = useState("0");
  const [actualMaterials, setActualMaterials] = useState([]);
  const [packagingRows, setPackagingRows] = useState([]);
  const [completionNote, setCompletionNote] = useState("");
  const [error, setError] = useState("");
  const [packagingLoadError, setPackagingLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    const produced = order.qualityControl?.producedQuantity ?? order.producedQuantity ?? order.plannedQuantity ?? 0;

    setProducedQuantity(String(produced));
    setDefectQuantity(String(order.qualityControl?.defectQuantity ?? order.defectQuantity ?? 0));
    setWasteQuantity(String(order.qualityControl?.wasteQuantity ?? order.wasteQuantity ?? 0));
    setActualMaterials((order.requiredMaterials || []).map((material) => ({
      productId: material.productId,
      productName: material.productName,
      unit: material.unit,
      plannedQuantity: Number(material.requiredQuantity || material.plannedQuantity || 0),
      actualQuantity: Number(material.actualQuantity || material.requiredQuantity || material.plannedQuantity || 0),
      cost: Number(material.cost || 0),
    })));
    setPackagingRows(Array.isArray(order.packaging) ? order.packaging.map((row) => createPackagingRow(order, row)) : []);
    setCompletionNote("");
    setError("");
  }, [open, order]);

  useEffect(() => {
    if (!open || !order) return undefined;

    let cancelled = false;
    setPackagingLoadError("");

    apiRequest("/products?status=ACTIVE&type=FINISHED_GOOD&limit=500", { skipCache: true })
      .then((result) => {
        if (cancelled) return;
        const remoteProducts = unwrapList(result, ["products"]);
        setProducts(Array.isArray(remoteProducts) ? remoteProducts : []);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setProducts([]);
        setPackagingLoadError(loadError?.message || "Qadoq variantlarini backenddan olib bo'lmadi.");
      });

    return () => {
      cancelled = true;
    };
  }, [open, order]);

  const existingPackRows = useMemo(() => {
    if (!order) return [];
    const parentProductId = order.outputProductId || order.productId;
    const bySize = new Map();

    products.forEach((product) => {
      let productUnit = "";
      try {
        productUnit = normalizeUnit(product.unit);
      } catch {
        return;
      }

      if (
        product.status !== "ACTIVE" ||
        product.type !== "FINISHED_GOOD" ||
        product.parentProductId !== parentProductId ||
        productUnit !== "dona" ||
        Number(product.packSize || 0) <= 0
      ) {
        return;
      }

      const key = `${Number(product.packSize)}:${product.packUnit || order.unit}`;
      if (!bySize.has(key)) {
        bySize.set(key, createPackagingRow(order, {
          packSize: product.packSize,
          packUnit: product.packUnit || order.unit,
          quantity: "",
        }));
      }
    });

    return [...bySize.values()].sort((left, right) => Number(right.packSize || 0) - Number(left.packSize || 0));
  }, [order, products]);

  useEffect(() => {
    if (!open || !order || packagingRows.length > 0 || existingPackRows.length === 0) return;
    setPackagingRows(existingPackRows);
  }, [existingPackRows, open, order, packagingRows.length]);

  if (!order) return null;

  const produced = Number(producedQuantity || 0);
  const defect = Number(defectQuantity || 0);
  const waste = Number(wasteQuantity || 0);
  const accepted = Math.max(produced - defect - waste, 0);
  const packagingTotal = packagingRows.reduce((total, row) => {
    try {
      return total + Number(row.quantity || 0) * convertQuantity(Number(row.packSize || 0), row.packUnit || order.unit, order.unit);
    } catch {
      return total;
    }
  }, 0);
  const remainingBulk = Math.max(accepted - packagingTotal, 0);
  const overPackAmount = Math.max(packagingTotal - accepted, 0);
  const rawMaterialCost = actualMaterials.reduce((total, material) => total + Number(material.actualQuantity || 0) * Number(material.cost || 0), 0);
  const overheadCost = calculateOverheadCost(order.overheadItems);
  const actualProductionCost = calculateActualProductionCost({ actualMaterialCost: rawMaterialCost, overheadCost });
  const actualUnitCost = calculateActualUnitCost({ actualProductionCost, producedQuantity: accepted });

  const updateMaterial = (productId, value) => {
    setActualMaterials((current) => current.map((material) => material.productId === productId ? { ...material, actualQuantity: value } : material));
  };

  const updatePackaging = (index, key, value) => {
    setPackagingRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };

  const addPackaging = () => {
    setPackagingRows((current) => [...current, createPackagingRow(order)]);
  };

  const removePackaging = (index) => {
    setPackagingRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const getPackageName = (row) => {
    const packSize = Number(row.packSize || 0);
    return packSize > 0 ? `${order.productName} ${packSize} ${row.packUnit || order.unit}` : `${order.productName} qadoq`;
  };

  const handleSubmit = async () => {
    setError("");

    if ([produced, defect, waste].some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Miqdorlar manfiy bo'lishi mumkin emas.");
      return;
    }
    if (defect + waste > produced) {
      setError("Brak va chiqindi ishlab chiqarilgan miqdordan oshmasligi kerak.");
      return;
    }
    if (overPackAmount > 0) {
      setError(`Qadoqlangan jami miqdor ishlab chiqarilgan miqdordan ${overPackAmount} ${order.unit} oshmoqda.`);
      return;
    }
    if (actualMaterials.some((material) => !Number.isFinite(Number(material.actualQuantity)) || Number(material.actualQuantity) < 0)) {
      setError("Xomashyo sarfi manfiy bo'lishi mumkin emas.");
      return;
    }
    if (packagingRows.some((row) => Number(row.quantity || 0) > 0 && (!Number.isInteger(Number(row.quantity)) || Number(row.packSize || 0) <= 0))) {
      setError("Qadoq hajmi 0 dan katta, qadoq soni esa butun son bo'lishi kerak.");
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
        packaging: packagingRows
          .filter((row) => Number(row.quantity || 0) > 0 && Number(row.packSize || 0) > 0)
          .map((row) => ({
            productName: getPackageName(row),
            quantity: Number(row.quantity || 0),
            unit: "dona",
            packSize: Number(row.packSize || 0),
            packUnit: normalizeUnit(row.packUnit || order.unit),
            materials: row.materials || [],
          })),
        outputWarehouseId: order.outputWarehouseId,
        materialWarehouseId: order.materialWarehouseId,
        completionNote: completionNote.trim(),
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
      title={translateText("Ishlab chiqarishni yakunlash")}
      description={`${order.number} - ${order.productName}`}
      size="lg"
    >
      <div className="production-complete">
        <div className="production-complete__summary">
          <div><span>Reja</span><strong>{order.plannedQuantity} {order.unit}</strong></div>
          <div><span>Ishlab chiqarildi</span><strong>{produced} {order.unit}</strong></div>
          <div><span>Qoldiq</span><strong className={overPackAmount > 0 ? "production-complete__negative" : ""}>{remainingBulk} {order.unit}</strong></div>
        </div>

        <div className="production-complete__result-grid">
          <Input label={`Ishlab chiqarildi (${order.unit})`} type="number" min="0" step="any" value={producedQuantity} onChange={(event) => setProducedQuantity(event.target.value)} />
          <Input label={`Brak (${order.unit})`} type="number" min="0" step="any" value={defectQuantity} onChange={(event) => setDefectQuantity(event.target.value)} />
          <Input label={`Chiqindi (${order.unit})`} type="number" min="0" step="any" value={wasteQuantity} onChange={(event) => setWasteQuantity(event.target.value)} />
        </div>

        <div className="production-complete__packaging">
          <div className="production-complete__materials-title">
            <div>
              <h4>Qadoqlash</h4>
              <p>Faqat qadoq hajmi va qadoq sonini kiriting. SKU, batch, unit va tannarxni platforma belgilaydi.</p>
            </div>
            <Button type="button" variant="secondary" onClick={addPackaging} leftIcon={<Plus size={15} />}>Qadoq qo'shish</Button>
          </div>
          {packagingLoadError && <div className="production-complete__error">{packagingLoadError}</div>}
          {packagingRows.map((row, index) => (
            <div className="production-complete__simple-package-row" key={row.id || index}>
              <Input
                label="Qadoq hajmi"
                type="number"
                min="0"
                step="any"
                value={row.packSize || ""}
                onChange={(event) => updatePackaging(index, "packSize", event.target.value)}
              />
              <Input
                label="Qadoq soni"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={row.quantity || ""}
                onChange={(event) => updatePackaging(index, "quantity", event.target.value)}
              />
              <div className="production-complete__package-total">
                <span>{getPackageName(row)}</span>
                <strong>{Number(row.packSize || 0) * Number(row.quantity || 0)} {order.unit}</strong>
              </div>
              <Button type="button" variant="ghost" aria-label="Qadoqni o'chirish" title="Qadoqni o'chirish" className="production-complete__package-delete" onClick={() => removePackaging(index)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <div className="production-complete__live-summary">
            <div><span>Ishlab chiqarildi</span><strong>{produced} {order.unit}</strong></div>
            <div><span>Qadoqlandi</span><strong>{packagingTotal} {order.unit}</strong></div>
            <div><span>Qoldi</span><strong className={overPackAmount > 0 ? "production-complete__negative" : ""}>{remainingBulk} {order.unit}</strong></div>
          </div>
        </div>

        {overPackAmount > 0 && (
          <div className="production-complete__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
            Qadoqlangan jami miqdor ishlab chiqarilgan miqdordan {overPackAmount} {order.unit} oshmoqda.
          </div>
        )}
        {overPackAmount === 0 && accepted === Number(order.plannedQuantity || 0) && (
          <div className="production-complete__success">
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={17} />
            Ishlab chiqarish rejasi to'liq bajarilgan.
          </div>
        )}

        <Textarea label="Izoh" value={completionNote} placeholder="Ixtiyoriy izoh..." onChange={(event) => setCompletionNote(event.target.value)} />

        <details className="production-complete__advanced">
          <summary>Batafsil ma'lumotlar</summary>
          <div className="production-complete__advanced-content">
            <div className="production-complete__materials">
              <div className="production-complete__materials-title">
                <div>
                  <h4>Xomashyo sarfini o'zgartirish</h4>
                  <p>Default holatda real sarf reja bilan teng olinadi.</p>
                </div>
              </div>
              <div className="production-complete__materials-header">
                <span>Xomashyo</span><span>Reja</span><span>Real sarf</span><span>Farq</span>
              </div>
              {actualMaterials.map((material) => {
                const difference = Number(material.actualQuantity || 0) - Number(material.plannedQuantity || 0);
                return (
                  <div key={material.productId} className="production-complete__material">
                    <div><strong>{material.productName}</strong><span>{formatManufacturingMoney(material.cost)} / {material.unit}</span></div>
                    <span>{Number(material.plannedQuantity).toFixed(2)} {material.unit}</span>
                    <Input type="number" min="0" step="any" value={material.actualQuantity} onChange={(event) => updateMaterial(material.productId, event.target.value)} />
                    <strong className={difference > 0 ? "production-complete__negative" : difference < 0 ? "production-complete__positive" : ""}>
                      {difference > 0 ? "+" : ""}{difference.toFixed(2)} {material.unit}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="production-complete__cost">
              <div><span>Xomashyo</span><strong>{formatManufacturingMoney(rawMaterialCost)}</strong></div>
              <div><span>Qo'shimcha xarajat</span><strong>{formatManufacturingMoney(overheadCost)}</strong></div>
              <div><span>Jami real tannarx</span><strong>{formatManufacturingMoney(actualProductionCost)}</strong></div>
              <div><span>1 birlik real tannarx</span><strong>{formatManufacturingMoney(actualUnitCost)}</strong></div>
            </div>
          </div>
        </details>

        {error && <div className="production-complete__error">{translateText(error)}</div>}

        <div className="production-complete__actions">
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={overPackAmount > 0}>
            Ishlab chiqarishni yakunlash
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionCompleteModal;
