import { useMemo, useState } from "react";

import { translateText } from "../../../../../localization/i18n";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

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

import { getStoredBoms } from "../../../utils/manufacturingStorage";

import { getStoredWarehouses } from "../../../../warehouse/utils/warehouseManagementStorage";
import { getDefaultWarehouseId } from "../../../../warehouse/utils/warehouseDefaults";

import {
  calculateProductionMaterialCost,
  calculateRequiredMaterials,
  formatProductionQuantity,
  getBomProductSnapshot,
} from "../../utils/productionOrderHelpers";

import {
  checkMaterialAvailability,
  hasEnoughMaterials,
} from "../../utils/materialAvailability";

import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";
import { aggregateQuantities } from "../../../../../shared/utils/units";
import { focusFirstInvalidField } from "../../../../../shared/utils/formFocus";

import "./ProductionOrderForm.scss";

const getToday = () => new Date().toISOString().slice(0, 10);

const ProductionOrderForm = ({ onSubmit, onCancel, submitError = "" }) => {
  const boms = useMemo(
    () => getStoredBoms().filter((bom) => bom.status === "ACTIVE"),
    [],
  );

  const warehouses = useMemo(
    () =>
      getStoredWarehouses().filter(
        (warehouse) => warehouse.status === "ACTIVE",
      ),
    [],
  );

  const [bomId, setBomId] = useState("");

  const [plannedQuantity, setPlannedQuantity] = useState("");

  const [warehouseId, setWarehouseId] = useState(
    getDefaultWarehouseId(warehouses, ["manufacturing.defaultProductionWarehouseId"]),
  );

  const [plannedDate, setPlannedDate] = useState(getToday());

  const [note, setNote] = useState("");

  const [errors, setErrors] = useState({});

  const selectedBom = boms.find((bom) => bom.id === bomId);

  const selectedBomSnapshot = getBomProductSnapshot(selectedBom);

  const requiredMaterials = useMemo(
    () =>
      calculateRequiredMaterials({
        bom: selectedBom,

        plannedQuantity,
      }),
    [selectedBom, plannedQuantity],
  );

  const availability = useMemo(
    () =>
      checkMaterialAvailability({
        warehouseId,
        requiredMaterials,
      }),
    [warehouseId, requiredMaterials],
  );

  const enoughMaterials = hasEnoughMaterials(availability);

  const plannedMaterialCost = calculateProductionMaterialCost(requiredMaterials);
  const materialSummary = aggregateQuantities(availability);

  const bomOptions = boms.map((bom) => ({
    value: bom.id,

    label: `${bom.productName} · v${bom.version}`,
  }));

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: warehouse.id,

    label: warehouse.name,
  }));

  const validate = () => {
    const nextErrors = {};

    if (!bomId) {
      nextErrors.bom = "Retsept tanlang.";
    }

    if (Number(plannedQuantity) <= 0) {
      nextErrors.quantity = "Reja miqdori 0 dan katta bo‘lishi kerak.";
    }

    if (!warehouseId) {
      nextErrors.warehouse = "Omborni tanlang.";
    }

    if (!plannedDate) {
      nextErrors.date = "Rejalashtirilgan sanani tanlang.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) focusFirstInvalidField();

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit?.({
      productId: selectedBomSnapshot.productId,

      productName: selectedBomSnapshot.productName,

      bomId: selectedBom.id,

      bomVersion: selectedBom.version,

      plannedQuantity: Number(plannedQuantity),

      unit: selectedBomSnapshot.unit,

      warehouseId,

      plannedDate,

      plannedMaterialCost,

      requiredMaterials: availability.map((material) => ({
        id: material.id || material.productId,

        productId: material.productId,

        productName: material.productName,

        sku: material.sku,

        unit: material.unit,

        bomQuantity: material.bomQuantity,

        requiredQuantity: material.requiredQuantity,

        cost: material.cost,

        totalCost: material.totalCost,
      })),

      note: note.trim(),
    });
  };

  return (
    <form className="production-order-form" onSubmit={handleSubmit}>
      {submitError && (
        <div className="production-order-form__error" role="alert">
          {submitError}
        </div>
      )}

      <Card padding="lg" className="production-order-form__section">
        <div className="production-order-form__section-header">
          <div>
            <h3>Ishlab chiqarish rejasi</h3>

            <p>Retsept, miqdor va ishlab chiqarish sanasini belgilang.</p>
          </div>
        </div>

        <div className="production-order-form__grid">
          <Select
            label="Retsept"
            value={bomId}
            placeholder="Retsept tanlang"
            options={bomOptions}
            error={errors.bom}
            onChange={(event) => setBomId(event.target.value)}
          />

          <Input
            label="Ishlab chiqarish miqdori"
            type="number"
            min="0"
            step="any"
            value={plannedQuantity}
            placeholder="1000"
            error={errors.quantity}
            onChange={(event) => setPlannedQuantity(event.target.value)}
          />

          <Select
            label="Xomashyo olinadigan ombor"
            value={warehouseId}
            options={warehouseOptions}
            error={errors.warehouse}
            onChange={(event) => setWarehouseId(event.target.value)}
          />

          <DatePicker
            label="Rejalashtirilgan sana"
            value={plannedDate}
            error={errors.date}
            onChange={(event) => setPlannedDate(event.target.value)}
          />
        </div>

        {selectedBomSnapshot && (
          <div className="production-order-form__bom-summary">
            <div>
              <span>Tayyor mahsulot</span>

              <strong>{selectedBomSnapshot.productName}</strong>
            </div>

            <div>
              <span>Retsept versiyasi</span>

              <strong>v{selectedBomSnapshot.bomVersion}</strong>
            </div>

            <div>
              <span>Output</span>

              <strong>
                {formatProductionQuantity(selectedBomSnapshot.outputQuantity)}{" "}
                {selectedBomSnapshot.unit}
              </strong>
            </div>
          </div>
        )}
      </Card>

      <Card padding="lg" className="production-order-form__section">
        <div className="production-order-form__section-header">
          <div>
            <h3>Xomashyo ehtiyoji</h3>

            <p>Reja miqdoriga qarab avtomatik hisoblanadi.</p>
          </div>

          {selectedBom && Number(plannedQuantity) > 0 && (
            <Badge
              className="production-order-form__availability-badge"
              variant={enoughMaterials ? "success" : "danger"}
            >
              {enoughMaterials ? (
                <>
                  <LiveIcon
                    icon={CheckCircle2}
                    motion="success-pop"
                    size={16}
                  />
                  Xomashyo yetarli
                </>
              ) : (
                <>
                  <LiveIcon
                    icon={AlertTriangle}
                    motion="warning-glow"
                    size={16}
                  />
                  Xomashyo yetarli emas
                </>
              )}
            </Badge>
          )}
        </div>

        {!selectedBom || Number(plannedQuantity) <= 0 ? (
          <div className="production-order-form__empty">
            Retsept va ishlab chiqarish miqdorini tanlang.
          </div>
        ) : (
          <div className="production-order-form__materials">
            <div className="production-order-form__materials-header">
              <span>Xomashyo</span>

              <span>Kerak</span>

              <span>Mavjud</span>

              <span>Holat</span>

              <span>Yetishmaydi</span>

              <span>Qiymat</span>
            </div>

            {availability.map((material) => (
              <div
                key={material.productId}
                className="production-order-form__material"
              >
                <div>
                  <strong>{material.productName}</strong>

                  <span>{material.sku || "—"}</span>
                </div>

                <strong>
                  {formatProductionQuantity(material.requiredQuantity)}{" "}
                  {material.unit}
                </strong>

                <span>
                  {formatProductionQuantity(material.availableQuantity)}{" "}
                  {material.unit}
                </span>

                <span
                  className={
                    material.enough
                      ? "production-order-form__material-status production-order-form__material-status--success"
                      : "production-order-form__material-status production-order-form__material-status--danger"
                  }
                >
                  {material.enough ? "Yetarli" : "Yetmaydi"}
                </span>

                <span>
                  {formatProductionQuantity(material.missingQuantity)}{" "}
                  {material.unit}
                </span>

                <strong>
                  {formatManufacturingMoney(material.totalCost)}
                </strong>
              </div>
            ))}
            <div className="production-order-form__material-summary">
              <strong>Jami miqdorlar</strong>
              {materialSummary.map((item) => (
                <span key={item.dimension}>
                  {translateText(
                    item.dimension === "WEIGHT"
                      ? "Jami massa"
                      : item.dimension === "VOLUME"
                        ? "Jami hajm"
                        : item.dimension === "LENGTH"
                          ? "Jami uzunlik"
                          : "Jami dona",
                  )}: {item.value} {item.unit}
                </span>
              ))}
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
          <Textarea
            label="Izoh"
            value={note}
            placeholder="Ishlab chiqarish bo‘yicha izoh..."
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      </div>

      {!enoughMaterials && selectedBom && Number(plannedQuantity) > 0 && (
        <div className="production-order-form__warning">
          <LiveIcon icon={AlertTriangle} motion="warning-glow" size={17} />

          <span>
            Xomashyo yetarli emas. Buyurtmani rejalashtirish mumkin, lekin
            ishlab chiqarishni boshlashda yetarli qoldiq talab qilinadi.
          </span>
        </div>
      )}

      <div className="production-order-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Bekor qilish
        </Button>

        <Button type="submit">Ishlab chiqarishni rejalashtirish</Button>
      </div>
    </form>
  );
};

export default ProductionOrderForm;
