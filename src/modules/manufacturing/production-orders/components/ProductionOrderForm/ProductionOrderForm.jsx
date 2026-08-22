import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { translateText } from "../../../../../localization/i18n";
import {
  Badge,
  Button,
  Card,
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

const AVAILABILITY_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

const getBomOptionLabel = (bom) => {
  const recipeName = String(bom?.name || "").trim();
  const productName = String(bom?.productName || bom?.outputProductName || "").trim();
  const title =
    recipeName && productName && recipeName !== productName
      ? `${recipeName} (${productName})`
      : recipeName || productName || "Nomsiz retsept";

  return `${title} - v${bom?.version || 1}${bom?.status === "ACTIVE" ? "" : " (faol emas)"}`;
};

const ProductionOrderForm = ({ initialValues = null, onSubmit, onCancel, submitError = "" }) => {
  const [boms, setBoms] = useState(() => getProductionBoms());
  const warehouses = useMemo(() => getStoredWarehouses().filter((warehouse) => warehouse.status === "ACTIVE"), []);
  const defaultWarehouseId = getDefaultWarehouseId(warehouses, ["manufacturing.defaultProductionWarehouseId"]);
  const [bomId, setBomId] = useState(initialValues?.bomId || "");
  const [plannedQuantity, setPlannedQuantity] = useState(initialValues?.plannedQuantity || "");
  const [materialWarehouseId, setMaterialWarehouseId] = useState(initialValues?.materialWarehouseId || initialValues?.warehouseId || defaultWarehouseId);
  const [outputWarehouseId, setOutputWarehouseId] = useState(initialValues?.outputWarehouseId || initialValues?.warehouseId || defaultWarehouseId);
  const plannedDate = initialValues?.plannedDate?.slice?.(0, 10) || getToday();
  const dueDate = initialValues?.dueDate?.slice?.(0, 10) || null;
  const priority = initialValues?.priority || "NORMAL";
  const responsible = initialValues?.responsible || "";
  const [note, setNote] = useState(initialValues?.note || "");
  const [errors, setErrors] = useState({});
  const [availability, setAvailability] = useState([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState(AVAILABILITY_STATUS.IDLE);
  const [bomLoadError, setBomLoadError] = useState("");
  const [bomLoading, setBomLoading] = useState(false);
  const userEditedQuantity = useRef(Boolean(initialValues?.plannedQuantity));
  const availabilityRequestSeq = useRef(0);

  const selectedBom = boms.find((bom) => bom.id === bomId);
  const selectedBomSnapshot = getBomProductSnapshot(selectedBom);
  const resetAvailabilityState = () => {
    availabilityRequestSeq.current += 1;
    setAvailability([]);
    setAvailabilityError("");
    setAvailabilityStatus(AVAILABILITY_STATUS.IDLE);
  };

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
    if (!materialWarehouseId && defaultWarehouseId) {
      setMaterialWarehouseId(defaultWarehouseId);
    }
    if (!outputWarehouseId && defaultWarehouseId) {
      setOutputWarehouseId(defaultWarehouseId);
    }
  }, [defaultWarehouseId, materialWarehouseId, outputWarehouseId]);

  useEffect(() => {
    if (!selectedBom || Number(plannedQuantity) <= 0 || !materialWarehouseId) {
      availabilityRequestSeq.current += 1;
      setAvailability([]);
      setAvailabilityError("");
      setAvailabilityStatus(AVAILABILITY_STATUS.IDLE);
      return undefined;
    }

    const requestId = availabilityRequestSeq.current + 1;
    availabilityRequestSeq.current = requestId;
    setAvailability([]);
    setAvailabilityError("");
    setAvailabilityStatus(AVAILABILITY_STATUS.LOADING);

    fetchProductionMaterialAvailability({
      recipeId: selectedBom.id,
      plannedQuantity: Number(plannedQuantity),
      materialWarehouseId,
    })
      .then((result) => {
        if (availabilityRequestSeq.current !== requestId) return;
        setAvailability(result.materials || []);
        setAvailabilityStatus(AVAILABILITY_STATUS.SUCCESS);
      })
      .catch((error) => {
        if (availabilityRequestSeq.current !== requestId) return;
        setAvailability([]);
        setAvailabilityError(error?.status === 404 ? "Xomashyo holatini tekshirib bo'lmadi." : error.message || "Xomashyo holatini tekshirib bo'lmadi.");
        setAvailabilityStatus(AVAILABILITY_STATUS.ERROR);
      });

    return () => {
      availabilityRequestSeq.current += 1;
    };
  }, [selectedBom, plannedQuantity, materialWarehouseId]);

  const availabilityLoading = availabilityStatus === AVAILABILITY_STATUS.LOADING;
  const availabilitySucceeded = availabilityStatus === AVAILABILITY_STATUS.SUCCESS;
  const availabilityIdle = availabilityStatus === AVAILABILITY_STATUS.IDLE;
  const enoughMaterials = availabilitySucceeded && availability.length > 0 && availability.every((material) => material.enough);
  const availabilityFailed = availabilityStatus === AVAILABILITY_STATUS.ERROR;
  const missingMaterials = availability.filter((material) => !material.enough);
  const plannedMaterialCost = calculateProductionMaterialCost(availability);
  const materialSummary = aggregateQuantities(availability);
  const bomOptions = boms.map((bom) => ({
    value: bom.id,
    label: getBomOptionLabel(bom),
  }));
  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.id,
    label: warehouse.name,
  }));
  const getAvailabilityValue = (material, ...keys) => {
    const key = keys.find((item) => material[item] !== undefined && material[item] !== null);
    return key ? material[key] : 0;
  };
  const availabilityBadgeVariant = availabilityIdle || availabilityLoading ? "neutral" : availabilityFailed ? "warning" : enoughMaterials ? "success" : "danger";
  const availabilityBadgeText = availabilityIdle
    ? "Tekshirish kutilmoqda"
    : availabilityLoading
      ? "Xomashyo holati tekshirilmoqda..."
      : availabilityFailed
        ? "Tekshirib bo'lmadi"
        : enoughMaterials
          ? "Barcha xomashyolar yetarli"
          : "Xomashyo yetishmaydi";
  const shouldShowAvailabilityWarning = selectedBom && Number(plannedQuantity) > 0 && (availabilityFailed || (availabilitySucceeded && !enoughMaterials));

  const validate = () => {
    const nextErrors = {};
    if (!bomId) nextErrors.bom = "Retsept tanlang.";
    if (selectedBom && selectedBom.status !== "ACTIVE") nextErrors.bom = "Bu retsept faol emas. Ishlab chiqarish uchun retseptni faollashtiring.";
    if (Number(plannedQuantity) <= 0) nextErrors.quantity = "Reja miqdori 0 dan katta bo'lishi kerak.";
    if (!materialWarehouseId) nextErrors.materialWarehouse = "Xomashyo omborini tanlang.";
    if (!outputWarehouseId) nextErrors.outputWarehouse = "Tayyor mahsulot omborini tanlang.";
    if (availabilityLoading) nextErrors.availability = "Xomashyo holati hali tekshirilmoqda.";
    else if (availabilityFailed) nextErrors.availability = "Xomashyo holatini tekshirib bo'lmadi.";
    else if (selectedBom && Number(plannedQuantity) > 0 && materialWarehouseId && !availabilitySucceeded) nextErrors.availability = "Xomashyo holati hali tekshirilmagan.";
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
            <h3>Yangi ishlab chiqarish</h3>
            <p>Retseptni tanlang, miqdorni tasdiqlang va platforma qolganini rejalashtiradi.</p>
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
              const nextBomId = event.target.value;
              const nextBom = boms.find((bom) => bom.id === nextBomId);
              setBomId(nextBomId);
              userEditedQuantity.current = false;
              resetAvailabilityState();
              if (Number(nextBom?.outputQuantity) > 0) setPlannedQuantity(String(nextBom.outputQuantity));
              if (!materialWarehouseId && defaultWarehouseId) setMaterialWarehouseId(defaultWarehouseId);
              if (!outputWarehouseId && defaultWarehouseId) setOutputWarehouseId(defaultWarehouseId);
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
              resetAvailabilityState();
              setPlannedQuantity(event.target.value);
            }}
          />
          <Select
            label="Xomashyo olinadigan ombor"
            value={materialWarehouseId}
            options={warehouseOptions}
            error={errors.materialWarehouse}
            onChange={(event) => {
              resetAvailabilityState();
              setMaterialWarehouseId(event.target.value);
            }}
          />
          <Select
            label="Tayyor mahsulot tushadigan ombor"
            value={outputWarehouseId}
            options={warehouseOptions}
            error={errors.outputWarehouse}
            onChange={(event) => setOutputWarehouseId(event.target.value)}
          />
          <Textarea
            className="production-order-form__note-field"
            label="Izoh"
            value={note}
            placeholder="Ixtiyoriy izoh..."
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {selectedBomSnapshot && (
          <div className="production-order-form__bom-summary">
            <div><span>Retsept</span><strong>{selectedBom.name || "Nomsiz retsept"}</strong></div>
            <div><span>Tayyor mahsulot</span><strong>{selectedBomSnapshot.productName}</strong></div>
            <div><span>Retsept versiyasi</span><strong>v{selectedBomSnapshot.bomVersion}</strong></div>
            <div><span>Output</span><strong>{formatProductionQuantity(selectedBomSnapshot.outputQuantity)} {selectedBomSnapshot.unit}</strong></div>
          </div>
        )}
      </Card>

      <Card padding="lg" className="production-order-form__section">
        <div className="production-order-form__section-header">
          <div>
            <h3>Xomashyo holati</h3>
            <p>Platforma retsept, scaling, availability, reservation va tannarxni backend orqali hisoblaydi.</p>
          </div>

          {selectedBom && Number(plannedQuantity) > 0 && (
            <Badge className="production-order-form__availability-badge" variant={availabilityBadgeVariant}>
              {enoughMaterials ? <LiveIcon icon={CheckCircle2} motion="success-pop" size={16} /> : <LiveIcon icon={AlertTriangle} motion="warning-glow" size={16} />}
              {availabilityBadgeText}
            </Badge>
          )}
        </div>

        {availabilityError && <div className="production-order-form__error">{availabilityError}</div>}
        {!selectedBom || Number(plannedQuantity) <= 0 ? (
          <div className="production-order-form__empty">Retsept va ishlab chiqarish miqdorini tanlang.</div>
        ) : (
          <div className="production-order-form__materials">
            {availabilityLoading ? (
              <div className="production-order-form__empty">Xomashyo holati tekshirilmoqda...</div>
            ) : availabilityIdle ? (
              <div className="production-order-form__empty">Xomashyo holati tekshirishga tayyorlanmoqda...</div>
            ) : availabilityFailed ? (
              <div className="production-order-form__empty production-order-form__empty--warning">
                Xomashyo holatini tekshirib bo'lmadi.
              </div>
            ) : enoughMaterials ? (
              <div className="production-order-form__ready">
                <LiveIcon icon={CheckCircle2} motion="success-pop" size={18} />
                <strong>Barcha xomashyolar yetarli</strong>
              </div>
            ) : (
              <div className="production-order-form__shortages">
                {missingMaterials.map((material) => (
                  <div key={material.productId} className="production-order-form__shortage">
                    <strong>{material.productName}</strong>
                    <span>Kerak: {formatProductionQuantity(material.requiredQuantity)} {material.unit}</span>
                    <span>Mavjud: {formatProductionQuantity(getAvailabilityValue(material, "availableQuantity", "available"))} {material.unit}</span>
                    <span>Yetishmaydi: {formatProductionQuantity(getAvailabilityValue(material, "missingQuantity", "shortage"))} {material.unit}</span>
                  </div>
                ))}
              </div>
            )}

            <details className="production-order-form__advanced">
              <summary>Batafsil hisob-kitob</summary>
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
            </details>
          </div>
        )}
      </Card>

      {shouldShowAvailabilityWarning && (
        <div className="production-order-form__warning">
          <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />
          <span>{availabilityFailed ? "Xomashyo holati aniqlanmaguncha rejalashtirishni davom ettirib bo'lmaydi." : "Xomashyo yetarli bo'lmasa boshlash backendda bloklanadi."}</span>
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
