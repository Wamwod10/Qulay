import { useEffect, useMemo, useRef, useState } from "react";

import { translateText } from "../../../../localization/i18n";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PackageCheck,
  Play,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  LiveIcon,
  Toast,
} from "../../../../shared/ui";

import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

import ProductionCompleteModal from "../../production-orders/components/ProductionCompleteModal/ProductionCompleteModal";

import ProductionOverheadPanel from "../../production-orders/components/ProductionOverheadPanel/ProductionOverheadPanel";

import { completeProductionOrder } from "../../production-orders/utils/productionExecution";

import QualityControlPanel from "../../quality/components/QualityControlPanel/QualityControlPanel";

import {
  updateProductionOrderOverhead,
  updateProductionOrderQuality,
} from "../../utils/manufacturingStorage";

import {
  getProductionOrderById,
  refreshProductionOrder,
  startProductionOrder,
} from "../../utils/manufacturingStorage";

import {
  formatManufacturingMoney,
  getProductionStatusLabel,
  getProductionStatusVariant,
} from "../../utils/manufacturingHelpers";

import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  calculateOverheadCost,
  positiveNumber,
} from "../../utils/productionCost";

import {
  checkMaterialAvailability,
  hasEnoughMaterials,
} from "../../production-orders/utils/materialAvailability";

import { formatProductionQuantity } from "../../production-orders/utils/productionOrderHelpers";

import "./ProductionOrderDetailsPage.scss";

import ProductionStages from "../../production-orders/components/ProductionStages/ProductionStages";

import {
  completeProductionStage,
  getProductionStages,
  startProductionStage,
} from "../../production-orders/utils/productionStages";

import { updateProductionOrderStages } from "../../utils/manufacturingStorage";
import { useManufacturingSettings } from "../../../settings/selectors/settingsSelectors";
import { aggregateQuantities } from "../../../../shared/utils/units";

const ProductionOrderDetailsPage = () => {
  const manufacturingSettings = useManufacturingSettings();
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [order, setOrder] = useState(() => getProductionOrderById(orderId));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shortages, setShortages] = useState([]);
  const [startPending, setStartPending] = useState(false);
  const [startError, setStartError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const refreshGeneration = useRef(0);

  useEffect(() => {
    const generation = refreshGeneration.current + 1;
    refreshGeneration.current = generation;
    refreshProductionOrder(orderId).then((freshOrder) => {
      if (freshOrder && generation === refreshGeneration.current) setOrder(freshOrder);
    }).catch((error) => {
      if (generation === refreshGeneration.current) setActionError(getApiErrorMessage(error));
    });
  }, [orderId]);

  const warehouses = useMemo(() => getStoredWarehouses(), []);
  const materialWarehouse = warehouses.find((item) => item.id === (order?.materialWarehouseId || order?.warehouseId));
  const outputWarehouse = warehouses.find((item) => item.id === (order?.outputWarehouseId || order?.warehouseId));

  const [completeOpen, setCompleteOpen] = useState(false);

  const stages = getProductionStages(order);

  const availability = useMemo(() => {
    if (!order) {
      return [];
    }

    const materials = order.requiredMaterials || [];
    if (materials.some((material) => material.available !== undefined || material.availableQuantity !== undefined)) {
      return materials;
    }

    return checkMaterialAvailability({
      warehouseId: order.materialWarehouseId || order.warehouseId,
      requiredMaterials: materials,
    });
  }, [order]);

  const enoughMaterials = hasEnoughMaterials(availability);
  const allStagesCompleted =
    stages.length > 0 && stages.every((stage) => stage.status === "COMPLETED");

  const currentOverheadCost = calculateOverheadCost(order?.overheadItems);

  const plannedMaterialCost = positiveNumber(
    order?.plannedMaterialCost ?? order?.materialCost,
  );

  const actualMaterialCost = positiveNumber(order?.actualMaterialCost);

  const completedOverheadCost = positiveNumber(
    order?.overheadCost ?? currentOverheadCost,
  );

  const actualProductionCost = positiveNumber(
    order?.actualProductionCost ??
      calculateActualProductionCost({
        actualMaterialCost,
        overheadCost: completedOverheadCost,
      }),
  );

  const actualUnitCost = positiveNumber(
    order?.actualUnitCost ??
      calculateActualUnitCost({
        actualProductionCost,
        producedQuantity: order?.producedQuantity,
      }),
  );

  const costDifference = actualProductionCost - plannedMaterialCost;
  const materialSummary = aggregateQuantities(order?.requiredMaterials || [], "requiredQuantity");
  const getAvailabilityValue = (material, ...keys) => {
    const key = keys.find((item) => material[item] !== undefined && material[item] !== null);
    return key ? material[key] : 0;
  };

  const handleStart = async () => {
    if (startPending || order.status !== "PLANNED") {
      setStartError(
        order.status === "IN_PROGRESS"
          ? "Bu ishlab chiqarish allaqachon boshlangan."
          : "Bu ishlab chiqarishni hozir boshlash mumkin emas.",
      );
      return;
    }

    setStartPending(true);
    setStartError("");
    refreshGeneration.current += 1;

    try {
      const startedOrder = await startProductionOrder(order.id);

      setOrder(startedOrder);
      setShortages([]);
      setConfirmOpen(false);
    } catch (error) {
      setShortages(error.shortages || []);
      setStartError(
        error.shortages?.length
          ? "Xomashyo yetarli emas. Yetishmayotgan miqdorlarni tekshiring."
          : getApiErrorMessage(error),
      );
    } finally {
      setStartPending(false);
    }
  };

  const handleSaveQuality = async (qualityControl) => {
    try {
      const updated = await updateProductionOrderQuality(order.id, qualityControl);

      setOrder(updated);
      setActionMessage("Sifat nazorati saqlandi.");
      setActionError("");
    } catch (error) {
      setActionError(getApiErrorMessage(error) || error.message || "Sifat nazoratini saqlashda xatolik.");
    }
  };

  const handleSaveOverhead = async (overheadItems) => {
    try {
      const updated = await updateProductionOrderOverhead(order.id, overheadItems);

      setOrder(updated);
      setActionMessage("Qo'shimcha xarajatlar saqlandi.");
      setActionError("");
    } catch (error) {
      setActionError(getApiErrorMessage(error) || error.message || "Qo'shimcha xarajatlarni saqlashda xatolik.");
    }
  };

  const handleStartStage = async (stageId) => {
    const previousOrder = order;

    try {
      const nextStages = startProductionStage(stages, stageId);

      setOrder((current) => current ? { ...current, stages: nextStages } : current);

      const updated = await updateProductionOrderStages(order.id, nextStages, stageId);

      setOrder(updated);
      setActionMessage("Bosqich boshlandi.");
      setActionError("");
    } catch (error) {
      setOrder(previousOrder);
      setActionError(getApiErrorMessage(error) || error.message || "Bosqichni boshlashda xatolik.");
    }
  };

  const handleCompleteStage = async (stageId) => {
    const previousOrder = order;

    try {
      const nextStages = completeProductionStage(stages, stageId);

      setOrder((current) => current ? { ...current, stages: nextStages } : current);

      const updated = await updateProductionOrderStages(order.id, nextStages, stageId);

      setOrder(updated);
      setActionMessage("Bosqich tugatildi.");
      setActionError("");
    } catch (error) {
      setOrder(previousOrder);
      setActionError(getApiErrorMessage(error) || error.message || "Bosqichni tugatishda xatolik.");
    }
  };

  const handleCompleteProduction = async (values) => {
    try {
      refreshGeneration.current += 1;
      const updated = await completeProductionOrder({
        orderId: order.id,

        ...values,
      });

      setOrder(updated);

      setCompleteOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  };

  const handleOpenComplete = () => {
    const allStagesCompleted = stages.every(
      (stage) => stage.status === "COMPLETED",
    );

    if (manufacturingSettings.productionStagesRequired && !allStagesCompleted) {
      setActionError("Avval barcha ishlab chiqarish bosqichlarini tugating.");

      return;
    }

    if (manufacturingSettings.qualityControlRequired && !order.qualityControl) {
      setActionError("Avval sifat nazorati tekshiruvini bajaring.");

      return;
    }

    if (
      manufacturingSettings.blockCompletionIfQcFail &&
      order.qualityControl?.result === "FAIL"
    ) {
      setActionError(
        "Quality Control natijasi rad etilgan. Ishlab chiqarishni yakunlab bo‘lmaydi.",
      );

      return;
    }

    setCompleteOpen(true);
  };

  if (!order) {
    return (
      <PageContainer title="Buyurtma topilmadi">
        <Button variant="secondary" onClick={() => navigate("/manufacturing")}>
          Ishlab chiqarishga qaytish
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={order.number}
      description={`${order.productName} ishlab chiqarish buyurtmasi`}
    >
      <div className="production-order-details">
        {actionMessage && (
          <Toast
            type="success"
            message={actionMessage}
            onClose={() => setActionMessage("")}
          />
        )}

        {actionError && (
          <Toast
            type="error"
            message={actionError}
            onClose={() => setActionError("")}
          />
        )}

        <div className="production-order-details__actions">
          <Button
            variant="secondary"
            onClick={() => navigate("/manufacturing")}
          >
            Ortga
          </Button>

          <div className="production-order-details__action-group">
            {order.status === "PLANNED" && (
              <Button
                leftIcon={
                  <LiveIcon icon={Play} motion="pulse-soft" size={17} />
                }
                onClick={() => {
                  setStartError("");
                  setShortages([]);
                  setConfirmOpen(true);
                }}
              >
                Ishlab chiqarishni boshlash
              </Button>
            )}

            {order.status === "IN_PROGRESS" && (
              <Button
                leftIcon={
                  <LiveIcon
                    icon={PackageCheck}
                    motion="pulse-soft"
                    active={allStagesCompleted}
                    size={17}
                  />
                }
                onClick={handleOpenComplete}
              >
                Ishlab chiqarishni yakunlash
              </Button>
            )}
          </div>
        </div>

        {shortages.length > 0 && (
          <Card padding="md" className="production-order-details__shortage">
            <strong>Xomashyo yetarli emas</strong>

            <div>
              {shortages.map((material) => (
                <span key={material.productId}>
                  {material.productName}:{" "}
                  {formatProductionQuantity(material.missingQuantity)}{" "}
                  {material.unit} yetishmaydi
                </span>
              ))}
            </div>
          </Card>
        )}

        <section className="production-order-details__summary">
          <OrderMetric label="Mahsulot" value={order.productName} />
          <OrderMetric label="Retsept" value={`v${order.bomVersion || "-"}`} />
          <OrderMetric
            label="Reja"
            value={`${formatProductionQuantity(order.plannedQuantity)} ${
              order.unit
            }`}
          />
          <OrderMetric label="Xomashyo ombori" value={materialWarehouse?.name || order.materialWarehouseId || order.warehouseId} />
          <OrderMetric label="Tayyor mahsulot ombori" value={outputWarehouse?.name || order.outputWarehouseId || order.warehouseId} />
          <OrderMetric label="Sana" value={order.plannedDate} />
          <OrderMetric
            label="Tannarx"
            value={formatManufacturingMoney(order.plannedMaterialCost)}
          />
          <OrderMetric label="Real" value={`${formatProductionQuantity(order.producedQuantity || 0)} ${order.unit}`} />
          <OrderMetric label="Yield" value={`${Number(order.yieldPercent || 0).toFixed(2)}%`} />
          <OrderMetric label="Waste" value={`${Number(order.wastePercent || 0).toFixed(2)}%${order.abnormalWaste ? " · abnormal" : ""}`} />
        </section>

        <section className="production-order-details__material-summary" aria-label="Material yig'indisi">
          {materialSummary.map((summary) => (
            <OrderMetric
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
        </section>

        {["IN_PROGRESS", "COMPLETED"].includes(order.status) && (
          <ProductionOverheadPanel
            order={order}
            readOnly={order.status === "COMPLETED"}
            onChange={handleSaveOverhead}
          />
        )}

        {order.status === "COMPLETED" && (
          <>
            <section className="production-order-details__actual-summary">
              <Card>
                <span>Reja</span>

                <strong>
                  {order.plannedQuantity} {order.unit}
                </strong>
              </Card>

              <Card>
                <span>Real ishlab chiqarildi</span>

                <strong>
                  {order.producedQuantity || 0} {order.unit}
                </strong>
              </Card>

              <Card>
                <span>Brak</span>

                <strong>
                  {order.defectQuantity || 0} {order.unit}
                </strong>
              </Card>

              <Card>
                <span>Yo‘qotish</span>

                <strong>
                  {order.wasteQuantity || 0} {order.unit}
                </strong>
              </Card>
            </section>

            {Array.isArray(order.packaging) && order.packaging.length > 0 && (
              <Card>
                <div className="production-order-details__section-title">
                  <h3>Qadoqlash natijasi</h3>
                  <p>Qadoqlangan mahsulotlar va qolgan bulk miqdori.</p>
                </div>
                <div className="production-order-details__plan-actual">
                  {order.packaging.map((row) => (
                    <div className="production-order-details__plan-row" key={row.id || `${row.productId}-${row.packSize}`}>
                      <div><strong>{row.productName || "Qadoqlangan SKU"}</strong></div>
                      <div><span>Qadoq soni</span><strong>{formatProductionQuantity(row.quantity || 0)} dona</strong></div>
                      <div><span>Hajmi</span><strong>{formatProductionQuantity(row.packSize || 0)} {row.packUnit || order.unit}</strong></div>
                      <div><span>Jami</span><strong>{formatProductionQuantity(Number(row.quantity || 0) * Number(row.packSize || 0))} {order.unit}</strong></div>
                    </div>
                  ))}
                  <OrderMetric
                    label="Qolgan bulk"
                    value={`${formatProductionQuantity(order.remainingBulkQuantity || 0)} ${order.unit}`}
                  />
                </div>
              </Card>
            )}

            <Card>
              <div className="production-order-details__section-title">
                <h3>Reja va amalda</h3>

                <p>Reja va real ishlab chiqarish natijasini solishtirish.</p>
              </div>

              <div className="production-order-details__plan-actual">
                <PlanActualRow
                  label="Ishlab chiqarish"
                  planned={Number(order.plannedQuantity || 0)}
                  actual={Number(order.producedQuantity || 0)}
                  unit={order.unit}
                />

                {(order.actualMaterials || []).map((material) => (
                  <PlanActualRow
                    key={material.productId}
                    label={material.productName}
                    planned={Number(material.plannedQuantity || 0)}
                    actual={Number(material.actualQuantity || 0)}
                    unit={material.unit}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <div className="production-order-details__section-title">
                <h3>Real tannarx</h3>

                <p>Ishlab chiqarish yakunida real sarf asosida hisoblangan.</p>
              </div>

              <div className="production-order-details__cost-grid">
                <div>
                  <span>Rejalashtirilgan material tannarxi</span>

                  <strong>
                    {formatManufacturingMoney(plannedMaterialCost)}
                  </strong>
                </div>

                <div>
                  <span>Real xomashyo tannarxi</span>

                  <strong>
                    {formatManufacturingMoney(actualMaterialCost)}
                  </strong>
                </div>

                <div>
                  <span>1 birlik real tannarx</span>

                  <strong className="production-order-details__unit-cost">
                    {formatManufacturingMoney(actualUnitCost)}
                  </strong>
                </div>

                <div>
                  <span>Qo'shimcha xarajat</span>

                  <strong>
                    {formatManufacturingMoney(completedOverheadCost)}
                  </strong>
                </div>

                <div>
                  <span>Jami real ishlab chiqarish tannarxi</span>

                  <strong>
                    {formatManufacturingMoney(actualProductionCost)}
                  </strong>
                </div>

                <div>
                  <span>Reja va amaldagi tannarx farqi</span>

                  <strong
                    className={
                      costDifference > 0
                        ? "production-order-details__cost-difference production-order-details__cost-difference--warning"
                        : costDifference < 0
                          ? "production-order-details__cost-difference production-order-details__cost-difference--success"
                          : "production-order-details__cost-difference"
                    }
                  >
                    {costDifference > 0 ? "+" : ""}
                    {formatManufacturingMoney(costDifference)}
                  </strong>
                </div>
              </div>
            </Card>

            <Card>
              <div className="production-order-details__section-title">
                <h3>Ishlab chiqarish tarixi</h3>

                <p>Buyurtmaning asosiy ishlab chiqarish voqealari.</p>
              </div>

              <div className="production-order-details__timeline">
                <ProductionHistoryItem
                  title="Buyurtma yaratildi"
                  date={order.createdAt}
                  status="neutral"
                />

                {order.startedAt && (
                  <ProductionHistoryItem
                    title="Ishlab chiqarish boshlandi"
                    date={order.startedAt}
                    status="warning"
                  />
                )}

                {order.completedAt && (
                  <ProductionHistoryItem
                    title="Ishlab chiqarish yakunlandi"
                    date={order.completedAt}
                    status="success"
                  />
                )}
              </div>
            </Card>

            {order.completionNote && (
              <Card>
                <div className="production-order-details__section-title">
                  <h3>Yakuniy izoh</h3>
                </div>

                <div className="production-order-details__completion-note">
                  {order.completionNote}
                </div>
              </Card>
            )}
          </>
        )}

        <Card padding="lg">
          <div className="production-order-details__section-header">
            <div>
              <h3>Buyurtma holati</h3>
              <p>Ishlab chiqarishni boshlash faqat real qoldiq yetarli bo'lsa ishlaydi.</p>
            </div>

            <div className="production-order-details__badges">
              <Badge variant={getProductionStatusVariant(order.status)}>
                <ProductionStatusIcon status={order.status} />
                {getProductionStatusLabel(order.status)}
              </Badge>

              <Badge variant={enoughMaterials ? "success" : "danger"}>
                {enoughMaterials ? (
                  <LiveIcon
                    icon={CheckCircle2}
                    motion="success-pop"
                    size={14}
                  />
                ) : (
                  <LiveIcon
                    icon={AlertTriangle}
                    motion="warning-glow"
                    size={14}
                  />
                )}
                {enoughMaterials ? "Xomashyo yetarli" : "Xomashyo yetarli emas"}
              </Badge>
            </div>
          </div>

          <div className="production-order-details__materials">
            <div className="production-order-details__materials-header">
              <span>Xomashyo</span>
              <span>Kerak</span>
              <span>Qoldiq</span>
              <span>Rezerv</span>
              <span>Mavjud</span>
              <span>Yetishmaydi</span>
              <span>Qiymat</span>
            </div>

            {availability.length > 0 ? availability.map((material) => (
              <div key={material.productId} className={["production-order-details__material-row", !material.enough ? "production-order-details__material-row--warning" : ""].filter(Boolean).join(" ")}>
                <div className="production-order-details__material-name">
                  <strong>{material.productName}</strong>
                  <span>SKU: {material.sku || "-"}</span>
                </div>
                <strong data-label="Kerak">{formatProductionQuantity(material.requiredQuantity)} {material.unit}</strong>
                <span data-label="Qoldiq">{formatProductionQuantity(getAvailabilityValue(material, "warehouseQuantity", "quantity"))} {material.unit}</span>
                <span data-label="Rezerv">{formatProductionQuantity(getAvailabilityValue(material, "reservedQuantity", "reserved"))} {material.unit}</span>
                <span data-label="Mavjud">{formatProductionQuantity(getAvailabilityValue(material, "availableQuantity", "available"))} {material.unit}</span>
                <span data-label="Yetishmaydi">{formatProductionQuantity(getAvailabilityValue(material, "missingQuantity", "shortage"))} {material.unit}</span>
                <strong data-label="Qiymat" className="production-order-details__material-money">{formatManufacturingMoney(material.totalCost)}</strong>
              </div>
            )) : (
              <div className="production-order-details__materials-empty">Xomashyo mavjud emas.</div>
            )}
          </div>

          {order.status === "IN_PROGRESS" && (
            <ProductionStages
              stages={stages}
              orderStatus={order.status}
              onStart={handleStartStage}
              onComplete={handleCompleteStage}
            />
          )}
        </Card>

        {order.note && (
          <Card padding="lg">
            <div className="production-order-details__section-header">
              <div>
                <h3>Izoh</h3>
              </div>
            </div>

            <div className="production-order-details__note">{order.note}</div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Ishlab chiqarishni boshlash"
        description="Xomashyo real qoldiq bo'yicha tekshiriladi, rezerv yetarli bo'lsa batchlardan FIFO/FEFO bo'yicha sarflanadi."
        confirmText="Boshlash"
        cancelText="Bekor qilish"
        loading={startPending}
        error={startError}
        onClose={() => {
          if (!startPending) {
            setConfirmOpen(false);
            setStartError("");
          }
        }}
        onConfirm={handleStart}
      />
      <ProductionCompleteModal
        open={completeOpen}
        order={order}
        onClose={() => setCompleteOpen(false)}
        onSubmit={handleCompleteProduction}
      />
      {order.status === "IN_PROGRESS" && (
        <QualityControlPanel order={order} onSave={handleSaveQuality} />
      )}
    </PageContainer>
  );
};

const OrderMetric = ({ label, value }) => (
  <Card className="production-order-details__metric" padding="md">
    <span>{label}</span>
    <strong>{value}</strong>
  </Card>
);

const ProductionStatusIcon = ({ status }) => {
  if (status === "IN_PROGRESS") {
    return <LiveIcon icon={LoaderCircle} motion="spin-slow" size={14} />;
  }

  if (status === "PLANNED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  }

  if (status === "COMPLETED") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  }

  return null;
};

const PlanActualRow = ({ label, planned, actual, unit }) => {
  const difference = actual - planned;

  const percent = planned > 0 ? (difference / planned) * 100 : 0;

  return (
    <div className="production-order-details__plan-row">
      <div>
        <strong>{label}</strong>
      </div>

      <div>
        <span>Reja</span>

        <strong>
          {planned.toFixed(2)} {unit}
        </strong>
      </div>

      <div>
        <span>Real</span>

        <strong>
          {actual.toFixed(2)} {unit}
        </strong>
      </div>

      <div>
        <span>Farq</span>

        <strong
          className={
            difference > 0
              ? "production-order-details__difference production-order-details__difference--up"
              : difference < 0
                ? "production-order-details__difference production-order-details__difference--down"
                : "production-order-details__difference"
          }
        >
          {difference > 0 ? "+" : ""}
          {difference.toFixed(2)} {unit}
          {planned > 0 && (
            <small>
              {" "}
              ({percent > 0 ? "+" : ""}
              {percent.toFixed(1)}%)
            </small>
          )}
        </strong>
      </div>
    </div>
  );
};

const ProductionHistoryItem = ({ title, date, status }) => (
  <div className="production-order-details__timeline-item">
    <div
      className={[
        "production-order-details__timeline-dot",
        status ? `production-order-details__timeline-dot--${status}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />

    <div>
      <strong>{title}</strong>

      <span>{date || "—"}</span>
    </div>
  </div>
);

export default ProductionOrderDetailsPage;
