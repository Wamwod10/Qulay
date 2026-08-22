import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  LiveIcon,
  Select,
  Textarea,
} from "../../../../../shared/ui";
import { focusFirstInvalidField } from "../../../../../shared/utils/formFocus";
import { aggregateQuantities } from "../../../../../shared/utils/units";
import { getDefaultWarehouseId } from "../../../../warehouse/utils/warehouseDefaults";
import { getStoredWarehouses } from "../../../../warehouse/utils/warehouseManagementStorage";
import {
  fetchProductionMaterialAvailability,
  fetchStoredBoms,
  getStoredBoms,
} from "../../../utils/manufacturingStorage";
import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import {
  calculateProductionMaterialCost,
  formatProductionQuantity,
  getBomProductSnapshot,
} from "../../utils/productionOrderHelpers";

import "./ProductionOrderForm.scss";

const getToday = () => new Date().toISOString().slice(0, 10);

const getProductionBoms = () =>
  getStoredBoms().filter((bom) => bom.status !== "ARCHIVED");

const ProductionOrderForm = ({ initialValues = null, onSubmit, onCancel, submitError = "" }) => {
  const [boms, setBoms] = useState(() => getProductionBoms());
  const warehouses = useMemo(() => getStoredWarehouses().filter((warehouse) => warehouse.status === "ACTIVE"), []);
  const defaultWarehouseId = getDefaultWarehouseId(warehouses, ["manufacturing.defaultProductionWarehouseId"]);
  const [bomId, setBomId] = useState(initialValues?.bomId || "");
  const [plannedQuantity, setPlannedQuantity] = useState(initialValues?.plannedQuantity || "");
  const [materialWarehouseId, setMaterialWarehouseId] = useState(initialValues?.materialWarehouseId || initialValues?.warehouseId || defaultWarehouseId);
  const [outputWarehouseId, setOutputWarehouseId] = useState(initialValues?.outputWarehouseId || initialValues?.warehouseId || defaultWarehouseId);
  const [plannedDate, setPlannedDate] = useState(initialValues?.plannedDate?.slice?.(0, 10) || getToday());
  const [dueDate, setDueDate] = useState(initialValues?.dueDate?.slice?.(0, 10) || "");
  const [priority, setPriority] = useState(initialValues?.priority || "NORMAL");
  const [responsible, setResponsible] = useState(initialValues?.responsible || "");
  const [note, setNote] = useState(initialValues?.note || "");
  const [errors, setErrors] = useState({});
  const [availability, setAvailability] = useState([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bomLoadError, setBomLoadError] = useState("");
  const [bomLoading, setBomLoading] = useState(false);
  const userEditedQuantity = useRef(Boolean(initialValues?.plannedQuantity));

  const selectedBom = boms.find((bom) => bom.id === bomId);
  const selectedBomSnapshot = getBomProductSnapshot(selectedBom);

  useEffect(() => {
    let cancelled = false;

    const loadBoms = async () => {
      setBomLoading(true);
      setBomLoadError("");

      try {
        const remoteBoms = await fetchStoredBoms();
        if (!cancelled) {
          setBoms(remoteBoms.filter((bom) => bom.status !== "ARCHIVED"));
        }
      } catch (error) {
        if (!cancelled) {
          setBoms(getProductionBoms());
          setBomLoadError(error?.message || "Retseptlarni yuklab bo'lmadi.");
        }
      } finally {
        if (!cancelled) setBomLoading(false);
      }
    };

    const handleManufacturingChanged = () => {
      setBoms(getProductionBoms());
    };

    window.addEventListener("manufacturing:changed", handleManufacturingChanged);
    void loadBoms();

    return () => {
      cancelled = true;
      window.removeEventListener("manufacturing:changed", handleManufacturingChanged);
    };
  }, []);

  useEffect(() => {
    if (!selectedBom || userEditedQuantity.current) return;
    if (Number(selectedBom.outputQuantity) > 0) setPlannedQuantity(String(selectedBom.outputQuantity));
  }, [selectedBom]);

  useEffect(() => {
    if (!selectedBom || Number(plannedQuantity) <= 0 || !materialWarehouseId) {
      setAvailability([]);
      return undefined;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError("");

    fetchProductionMaterialAvailability({
      bomId: selectedBom.id,
      plannedQuantity: Number(plannedQuantity),
      materialWarehouseId,
    })
      .then((result) => {
        if (!cancelled) setAvailability(result.materials || []);
      })
      .catch((error) => {
        if (!cancelled) {
          setAvailability([]);
          setAvailabilityError(error.message || "Xomashyo mavjudligini tekshirib bo'lmadi.");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBom, plannedQuantity, materialWarehouseId]);

  const enoughMaterials = availability.length > 0 && availability.every((material) => material.enough);
  const plannedMaterialCost = calculateProductionMaterialCost(availability);
  const materialSummary = aggregateQuantities(availability);
  const bomOptions = boms.map((bom) => ({
    value: bom.id,
    label: `${bom.productName || bom.name} - v${bom.version}${bom.status === "ACTIVE" ? "" : " (faol emas)"}`,
  }));
  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.id,
    label: warehouse.name,
  }));
  const getAvailabilityValue = (material, ...keys) => {
    const key = keys.find((item) => material[item] !== undefined && material[item] !== null);
    return key ? material[key] : 0;
  };

  const validate = () => {
    const nextErrors = {};
    if (!bomId) nextErrors.bom = "Retsept tanlang.";
    if (selectedBom && selectedBom.status !== "ACTIVE") nextErrors.bom = "Bu retsept faol emas. Ishlab chiqarish uchun retseptni faollashtiring.";
    if (Number(plannedQuantity) <= 0) nextErrors.quantity = "Reja miqdori 0 dan katta bo'lishi kerak.";
    if (!materialWarehouseId) nextErrors.materialWarehouse = "Xomashyo omborini tanlang.";
    if (!outputWarehouseId) nextErrors.outputWarehouse = "Tayyor mahsulot omborini tanlang.";
    if (!plannedDate) nextErrors.date = "Rejalashtirilgan sanani tanlang.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) focusFirstInvalidField();
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit?.({
      productId: selectedBomSnapshot.productId,
      productName: selectedBomSnapshot.productName,
      bomId: selectedBom.id,
      bomVersion: selectedBom.version,
      plannedQuantity: Number(plannedQuantity),
      unit: selectedBomSnapshot.unit,
      warehouseId: materialWarehouseId,
      materialWarehouseId,
      outputWarehouseId,
      plannedDate,
      dueDate: dueDate || null,
      priority,
      responsible: responsible.trim(),
      plannedMaterialCost,
      requiredMaterials: availability,
      note: note.trim(),
    });
  };

  return (
    <form className="production-order-form" onSubmit={handleSubmit}>
      {submitError && <div className="production-order-form__error" role="alert">{submitError}</div>}

      <Card padding="lg" className="production-order-form__section">
        <div className="production-order-form__section-header">
          <div>
            <h3>Ishlab chiqarish rejasi</h3>
            <p>Retsept, miqdor, omborlar va muddatlarni belgilang.</p>
          </div>
        </div>

        <div className="production-order-form__grid">
          <Select
            label="Retsept"
            value={bomId}
            placeholder={bomLoading ? "Retseptlar yuklanmoqda" : "Retsept tanlang"}
            options={bomOptions}
            error={errors.bom || bomLoadError}
            onChange={(event) => {
              setBomId(event.target.value);
              userEditedQuantity.current = false;
            }}
          />
          <Input
            label="Ishlab chiqarish miqdori"
            type="number"
            min="0"
            step="any"
            value={plannedQuantity}
            placeholder="100"
            error={errors.quantity}
            onChange={(event) => {
              userEditedQuantity.current = true;
              setPlannedQuantity(event.target.value);
            }}
          />
          <Select
            label="Xomashyo olinadigan ombor"
            value={materialWarehouseId}
            options={warehouseOptions}
            error={errors.materialWarehouse}
            onChange={(event) => setMaterialWarehouseId(event.target.value)}
          />
          <Select
            label="Tayyor mahsulot tushadigan ombor"
            value={outputWarehouseId}
            options={warehouseOptions}
            error={errors.outputWarehouse}
            onChange={(event) => setOutputWarehouseId(event.target.value)}
          />
          <DatePicker label="Rejalashtirilgan sana" value={plannedDate} error={errors.date} onChange={(event) => setPlannedDate(event.target.value)} />
          <DatePicker label="Muddat" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Select
            label="Prioritet"
            value={priority}
            options={[
              { value: "LOW", label: "Past" },
              { value: "NORMAL", label: "Oddiy" },
              { value: "HIGH", label: "Yuqori" },
              { value: "URGENT", label: "Shoshilinch" },
            ]}
            onChange={(event) => setPriority(event.target.value)}
          />
          <Input label="Mas'ul" value={responsible} onChange={(event) => setResponsible(event.target.value)} />
        </div>

        {selectedBomSnapshot && (
          <div className="production-order-form__bom-summary">
            <div><span>Tayyor mahsulot</span><strong>{selectedBomSnapshot.productName}</strong></div>
            <div><span>Retsept versiyasi</span><strong>v{selectedBomSnapshot.bomVersion}</strong></div>
            <div><span>Output</span><strong>{formatProductionQuantity(selectedBomSnapshot.outputQuantity)} {selectedBomSnapshot.unit}</strong></div>
          </div>
        )}
      </Card>

      <Card padding="lg" className="production-order-form__section">
        <div className="production-order-form__section-header">
          <div>
            <h3>Xomashyo ehtiyoji</h3>
            <p>Backend canonical scaling va real reserved/available qoldiq bo'yicha hisoblanadi.</p>
          </div>

          {selectedBom && Number(plannedQuantity) > 0 && (
            <Badge className="production-order-form__availability-badge" variant={enoughMaterials ? "success" : "danger"}>
              {enoughMaterials ? <LiveIcon icon={CheckCircle2} motion="success-pop" size={16} /> : <LiveIcon icon={AlertTriangle} motion="warning-glow" size={16} />}
              {availabilityLoading ? "Tekshirilmoqda" : enoughMaterials ? "Xomashyo yetarli" : "Xomashyo yetarli emas"}
            </Badge>
          )}
        </div>

        {availabilityError && <div className="production-order-form__error">{availabilityError}</div>}
        {!selectedBom || Number(plannedQuantity) <= 0 ? (
          <div className="production-order-form__empty">Retsept va ishlab chiqarish miqdorini tanlang.</div>
        ) : (
          <div className="production-order-form__materials">
            <div className="production-order-form__materials-header">
              <span>Xomashyo</span>
              <span>Kerak</span>
              <span>Qoldiq</span>
              <span>Rezerv</span>
              <span>Mavjud</span>
              <span>Yetishmaydi</span>
              <span>Qiymat</span>
            </div>
            {availability.map((material) => (
              <div key={material.productId} className={["production-order-form__material", !material.enough ? "production-order-form__material--warning" : ""].filter(Boolean).join(" ")}>
                <div className="production-order-form__material-name"><strong>{material.productName}</strong><span>SKU: {material.sku || "-"}</span></div>
                <strong data-label="Kerak">{formatProductionQuantity(material.requiredQuantity)} {material.unit}</strong>
                <span data-label="Qoldiq">{formatProductionQuantity(getAvailabilityValue(material, "warehouseQuantity", "quantity"))} {material.unit}</span>
                <span data-label="Rezerv">{formatProductionQuantity(getAvailabilityValue(material, "reservedQuantity", "reserved"))} {material.unit}</span>
                <span data-label="Mavjud">{formatProductionQuantity(getAvailabilityValue(material, "availableQuantity", "available"))} {material.unit}</span>
                <span data-label="Yetishmaydi">{formatProductionQuantity(getAvailabilityValue(material, "missingQuantity", "shortage"))} {material.unit}</span>
                <strong data-label="Qiymat" className="production-order-form__material-money">{formatManufacturingMoney(material.totalCost)}</strong>
              </div>
            ))}
            <div className="production-order-form__material-summary">
              {materialSummary.map((item) => (
                <div key={item.dimension}>
                  <span>{translateText(item.dimension === "WEIGHT" ? "Jami massa" : item.dimension === "VOLUME" ? "Jami hajm" : item.dimension === "LENGTH" ? "Jami uzunlik" : "Jami dona")}</span>
                  <strong>{item.value} {item.unit}</strong>
                </div>
              ))}
              <div>
                <span>Material qiymati</span>
                <strong>{formatManufacturingMoney(plannedMaterialCost)}</strong>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="production-order-form__bottom">
        <Card padding="lg" className="production-order-form__cost">
          <span>Rejalashtirilgan xomashyo tannarxi</span>
          <strong>{formatManufacturingMoney(plannedMaterialCost)}</strong>
        </Card>
        <Card padding="lg">
          <Textarea label="Izoh" value={note} placeholder="Ishlab chiqarish bo'yicha izoh..." onChange={(event) => setNote(event.target.value)} />
        </Card>
      </div>

      {!enoughMaterials && selectedBom && Number(plannedQuantity) > 0 && (
        <div className="production-order-form__warning">
          <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
          <span>Xomashyo yetarli bo'lmasa buyurtma PLANNED bo'lib saqlanadi, lekin start backendda bloklanadi.</span>
        </div>
      )}

      <div className="production-order-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Bekor qilish</Button>
        <Button type="submit">Ishlab chiqarishni rejalashtirish</Button>
      </div>
    </form>
  );
};

export default ProductionOrderForm;
