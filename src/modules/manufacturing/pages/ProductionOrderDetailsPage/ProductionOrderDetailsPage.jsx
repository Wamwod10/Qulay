import { useEffect, useMemo, useRef, useState } from "react";
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
import { translateText } from "../../../../localization/i18n";
import { getApiErrorMessage } from "../../../../services/api/apiErrorHandler";
import { Badge, Button, Card, LiveIcon, Modal, Toast } from "../../../../shared/ui";
import { aggregateQuantities } from "../../../../shared/utils/units";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";
import ProductionCompleteModal from "../../production-orders/components/ProductionCompleteModal/ProductionCompleteModal";
import ProductionOverheadPanel from "../../production-orders/components/ProductionOverheadPanel/ProductionOverheadPanel";
import ProductionStages from "../../production-orders/components/ProductionStages/ProductionStages";
import { completeProductionOrder } from "../../production-orders/utils/productionExecution";
import {
  completeProductionStage,
  getProductionStages,
  startProductionStage,
} from "../../production-orders/utils/productionStages";
import {
  hasEnoughMaterials,
} from "../../production-orders/utils/materialAvailability";
import { formatProductionQuantity } from "../../production-orders/utils/productionOrderHelpers";
import QualityControlPanel from "../../quality/components/QualityControlPanel/QualityControlPanel";
import {
  getProductionOrderById,
  fetchProductionMaterialAvailability,
  refreshProductionOrder,
  startProductionOrder,
  updateProductionOrderOverhead,
  updateProductionOrderQuality,
  updateProductionOrderStages,
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

import "./ProductionOrderDetailsPage.scss";

const ProductionOrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const refreshGeneration = useRef(0);

  const [order, setOrder] = useState(() => getProductionOrderById(orderId));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [shortages, setShortages] = useState([]);
  const [startPending, setStartPending] = useState(false);
  const [startError, setStartError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    const generation = refreshGeneration.current + 1;
    refreshGeneration.current = generation;
    refreshProductionOrder(orderId)
      .then((freshOrder) => {
        if (freshOrder && generation === refreshGeneration.current) setOrder(freshOrder);
      })
      .catch((error) => {
        if (generation === refreshGeneration.current) setActionError(getApiErrorMessage(error));
      });
  }, [orderId]);

  const warehouses = useMemo(() => getStoredWarehouses(), []);
  const materialWarehouse = warehouses.find((item) => item.id === (order?.materialWarehouseId || order?.warehouseId));
  const outputWarehouse = warehouses.find((item) => item.id === (order?.outputWarehouseId || order?.warehouseId));
  const stages = getProductionStages(order);

  useEffect(() => {
    if (!order) {
      setAvailability([]);
      setAvailabilityError("");
      setAvailabilityLoading(false);
      return undefined;
    }

    const materials = order.requiredMaterials || [];
    if (order.status !== "PLANNED") {
      setAvailability(materials);
      setAvailabilityError("");
      setAvailabilityLoading(false);
      return undefined;
    }

    if (!order.bomId && !order.recipeSnapshot) {
      setAvailability(materials);
      setAvailabilityError("");
      setAvailabilityLoading(false);
      return undefined;
    }

    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError("");

    fetchProductionMaterialAvailability({
      recipeId: order.bomId,
      recipeSnapshot: order.recipeSnapshot,
      plannedQuantity: Number(order.plannedQuantity || 0),
      materialWarehouseId: order.materialWarehouseId || order.warehouseId,
    })
      .then((result) => {
        if (!cancelled) setAvailability(result.materials || []);
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability([]);
          setAvailabilityError("Xomashyo holatini tekshirib bo'lmadi.");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [order]);

  const enoughMaterials = hasEnoughMaterials(availability);
  const availabilityFailed = Boolean(availabilityError);
  const missingMaterials = availability.filter((material) => !material.enough);
  const materialSummary = aggregateQuantities(order?.requiredMaterials || [], "requiredQuantity");
  const currentOverheadCost = calculateOverheadCost(order?.overheadItems);
  const plannedMaterialCost = positiveNumber(order?.plannedMaterialCost ?? order?.materialCost);
  const actualMaterialCost = positiveNumber(order?.actualMaterialCost);
  const completedOverheadCost = positiveNumber(order?.overheadCost ?? currentOverheadCost);
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

  const getAvailabilityValue = (material, ...keys) => {
    const key = keys.find((item) => material[item] !== undefined && material[item] !== null);
    return key ? material[key] : 0;
  };

  const handleStart = async () => {
    if (startPending || order.status !== "PLANNED") {
      setStartError(order.status === "IN_PROGRESS" ? "Bu ishlab chiqarish allaqachon boshlangan." : "Bu ishlab chiqarishni hozir boshlash mumkin emas.");
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
      setStartError(error.shortages?.length ? "Xomashyo yetarli emas. Yetishmayotgan miqdorlarni tekshiring." : getApiErrorMessage(error));
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
      throw error;
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
      const updated = await completeProductionOrder({ orderId: order.id, ...values });
      setOrder(updated);
      setCompleteOpen(false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
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
    <PageContainer title={order.number} description={`${order.productName} ishlab chiqarish buyurtmasi`}>
      <div className="production-order-details">
        {actionMessage && <Toast type="success" message={actionMessage} onClose={() => setActionMessage("")} />}
        {actionError && <Toast type="error" message={actionError} onClose={() => setActionError("")} />}

        <div className="production-order-details__actions">
          <Button variant="secondary" onClick={() => navigate("/manufacturing")}>Ortga</Button>
          <div className="production-order-details__action-group">
            {order.status === "PLANNED" && (
              <Button
                leftIcon={<LiveIcon icon={Play} motion="pulse-soft" size={17} />}
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
              <Button leftIcon={<LiveIcon icon={PackageCheck} motion="pulse-soft" active size={17} />} onClick={() => setCompleteOpen(true)}>
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
                  {material.productName}: {formatProductionQuantity(material.missingQuantity)} {material.unit} yetishmaydi
                </span>
              ))}
            </div>
          </Card>
        )}

        <section className="production-order-details__summary">
          <OrderMetric label="Mahsulot" value={order.productName} />
          <OrderMetric label="Status" value={getProductionStatusLabel(order.status)} />
          <OrderMetric label="Reja" value={`${formatProductionQuantity(order.plannedQuantity)} ${order.unit}`} />
          <OrderMetric label="Xomashyo ombori" value={materialWarehouse?.name || order.materialWarehouseId || order.warehouseId} />
          <OrderMetric label="Tayyor mahsulot ombori" value={outputWarehouse?.name || order.outputWarehouseId || order.warehouseId} />
        </section>

        <Card padding="lg">
          <div className="production-order-details__section-header">
            <div>
              <h3>Xomashyo holati</h3>
              <p>Start paytida backend rezerv, FIFO/FEFO va batch allocationni bajaradi.</p>
            </div>
            <div className="production-order-details__badges">
              <Badge variant={getProductionStatusVariant(order.status)}>
                <ProductionStatusIcon status={order.status} />
                {getProductionStatusLabel(order.status)}
              </Badge>
              <Badge variant={availabilityFailed ? "warning" : enoughMaterials ? "success" : "danger"}>
                {enoughMaterials && !availabilityFailed ? <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} /> : <LiveIcon icon={AlertTriangle} motion="warning-glow" size={14} />}
                {availabilityLoading ? "Tekshirilmoqda" : availabilityFailed ? "Tekshirib bo'lmadi" : enoughMaterials ? "Barcha xomashyolar yetarli" : "Xomashyo yetishmaydi"}
              </Badge>
            </div>
          </div>

          {availabilityLoading ? (
            <div className="production-order-details__materials-empty">Xomashyo tekshirilmoqda...</div>
          ) : availabilityFailed ? (
            <div className="production-order-details__materials-empty production-order-details__materials-empty--warning">
              {availabilityError}
            </div>
          ) : enoughMaterials ? (
            <div className="production-order-details__ready">
              <LiveIcon icon={CheckCircle2} motion="success-pop" size={18} />
              <strong>Barcha xomashyolar yetarli</strong>
            </div>
          ) : (
            <div className="production-order-details__shortages-list">
              {missingMaterials.map((material) => (
                <div key={material.productId} className="production-order-details__shortage-item">
                  <strong>{material.productName}</strong>
                  <span>Kerak: {formatProductionQuantity(material.requiredQuantity)} {material.unit}</span>
                  <span>Mavjud: {formatProductionQuantity(getAvailabilityValue(material, "availableQuantity", "available"))} {material.unit}</span>
                  <span>Yetishmaydi: {formatProductionQuantity(getAvailabilityValue(material, "missingQuantity", "shortage"))} {material.unit}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <details className="production-order-details__advanced">
          <summary>Batafsil ma'lumotlar</summary>
          <div className="production-order-details__advanced-content">
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
              <ProductionOverheadPanel order={order} readOnly={order.status === "COMPLETED"} onChange={handleSaveOverhead} />
            )}

            <Card padding="lg">
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
            </Card>

            {order.status === "IN_PROGRESS" && (
              <>
                <ProductionStages stages={stages} orderStatus={order.status} onStart={handleStartStage} onComplete={handleCompleteStage} readOnly />
                <QualityControlPanel order={order} onSave={handleSaveQuality} />
              </>
            )}
          </div>
        </details>

        {order.status === "COMPLETED" && (
          <>
            <section className="production-order-details__actual-summary">
              <Card><span>Reja</span><strong>{formatProductionQuantity(order.plannedQuantity)} {order.unit}</strong></Card>
              <Card><span>Real ishlab chiqarildi</span><strong>{formatProductionQuantity(order.producedQuantity || 0)} {order.unit}</strong></Card>
              <Card><span>Brak</span><strong>{formatProductionQuantity(order.defectQuantity || 0)} {order.unit}</strong></Card>
              <Card><span>Chiqindi</span><strong>{formatProductionQuantity(order.wasteQuantity || 0)} {order.unit}</strong></Card>
            </section>

            {Array.isArray(order.packaging) && order.packaging.length > 0 && (
              <Card>
                <div className="production-order-details__section-title">
                  <h3>Qadoqlash natijasi</h3>
                  <p>Qadoqlangan mahsulotlar dona birligida, bulk qoldiq esa parent unitda saqlanadi.</p>
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
                  <OrderMetric label="Qolgan bulk" value={`${formatProductionQuantity(order.remainingBulkQuantity || 0)} ${order.unit}`} />
                </div>
              </Card>
            )}

            <Card>
              <div className="production-order-details__section-title">
                <h3>Real tannarx</h3>
                <p>Backend actual batch cost, packaging material va overhead asosida hisoblagan.</p>
              </div>
              <div className="production-order-details__cost-grid">
                <div><span>Rejalashtirilgan material</span><strong>{formatManufacturingMoney(plannedMaterialCost)}</strong></div>
                <div><span>Real material</span><strong>{formatManufacturingMoney(actualMaterialCost)}</strong></div>
                <div><span>1 birlik tannarx</span><strong className="production-order-details__unit-cost">{formatManufacturingMoney(actualUnitCost)}</strong></div>
                <div><span>Qo'shimcha xarajat</span><strong>{formatManufacturingMoney(completedOverheadCost)}</strong></div>
                <div><span>Jami real tannarx</span><strong>{formatManufacturingMoney(actualProductionCost)}</strong></div>
                <div>
                  <span>Farq</span>
                  <strong className={costDifference > 0 ? "production-order-details__cost-difference production-order-details__cost-difference--warning" : costDifference < 0 ? "production-order-details__cost-difference production-order-details__cost-difference--success" : "production-order-details__cost-difference"}>
                    {costDifference > 0 ? "+" : ""}{formatManufacturingMoney(costDifference)}
                  </strong>
                </div>
              </div>
            </Card>

            <Card>
              <div className="production-order-details__section-title">
                <h3>Ishlab chiqarish tarixi</h3>
              </div>
              <div className="production-order-details__timeline">
                <ProductionHistoryItem title="Buyurtma yaratildi" date={order.createdAt} status="neutral" />
                {order.startedAt && <ProductionHistoryItem title="Ishlab chiqarish boshlandi" date={order.startedAt} status="warning" />}
                {order.completedAt && <ProductionHistoryItem title="Ishlab chiqarish yakunlandi" date={order.completedAt} status="success" />}
              </div>
            </Card>
          </>
        )}

        {order.note && (
          <Card padding="lg">
            <div className="production-order-details__section-header">
              <div><h3>Izoh</h3></div>
            </div>
            <div className="production-order-details__note">{order.note}</div>
          </Card>
        )}
      </div>

      <Modal
        open={confirmOpen}
        title="Ishlab chiqarishni boshlaysizmi?"
        description="Tasdiqlangandan keyin platforma rezerv, FIFO/FEFO va batch sarfini avtomatik bajaradi."
        size="sm"
        onClose={() => {
          if (!startPending) {
            setConfirmOpen(false);
            setStartError("");
          }
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={startPending}>Bekor qilish</Button>
            <Button onClick={handleStart} loading={startPending}>Boshlash</Button>
          </>
        }
      >
        <div className="production-order-details__start-summary">
          <div><span>Mahsulot</span><strong>{order.productName}</strong></div>
          <div><span>Reja</span><strong>{formatProductionQuantity(order.plannedQuantity)} {order.unit}</strong></div>
          <div><span>Xomashyo</span><strong>{availabilityFailed ? "tekshirib bo'lmadi" : enoughMaterials ? "yetarli" : "yetishmaydi"}</strong></div>
          <div><span>Ombor</span><strong>{materialWarehouse?.name || order.materialWarehouseId || order.warehouseId}</strong></div>
        </div>
        {startError && <div className="production-order-details__modal-error">{startError}</div>}
      </Modal>

      <ProductionCompleteModal
        open={completeOpen}
        order={order}
        onClose={() => setCompleteOpen(false)}
        onSubmit={handleCompleteProduction}
      />
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
  if (status === "IN_PROGRESS") return <LiveIcon icon={LoaderCircle} motion="spin-slow" size={14} />;
  if (status === "PLANNED") return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  if (status === "COMPLETED") return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  return null;
};

const ProductionHistoryItem = ({ title, date, status }) => (
  <div className="production-order-details__timeline-item">
    <div className={["production-order-details__timeline-dot", status ? `production-order-details__timeline-dot--${status}` : ""].filter(Boolean).join(" ")} />
    <div>
      <strong>{title}</strong>
      <span>{date || "-"}</span>
    </div>
  </div>
);

export default ProductionOrderDetailsPage;
