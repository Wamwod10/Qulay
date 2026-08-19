import { useEffect, useMemo, useState } from "react";

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
  Table,
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

  useEffect(() => {
    refreshProductionOrder(orderId).then((freshOrder) => {
      if (freshOrder) setOrder(freshOrder);
    }).catch(() => undefined);
  }, [orderId]);

  const warehouses = useMemo(() => getStoredWarehouses(), []);
  const warehouse = warehouses.find((item) => item.id === order?.warehouseId);

  const [completeOpen, setCompleteOpen] = useState(false);

  const stages = getProductionStages(order);

  const availability = useMemo(() => {
    if (!order) {
      return [];
    }

    return checkMaterialAvailability({
      warehouseId: order.warehouseId,
      requiredMaterials: order.requiredMaterials || [],
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

  const handleStart = async () => {
    try {
      const startedOrder = await startProductionOrder(order.id);

      setOrder(startedOrder);
      setShortages([]);
      setConfirmOpen(false);
    } catch (error) {
      setShortages(error.shortages || []);
      setConfirmOpen(false);
    }
  };

  const handleSaveQuality = async (qualityControl) => {
    try {
      const updated = await updateProductionOrderQuality(order.id, qualityControl);

      setOrder(updated);
    } catch (error) {
      alert(error.message || "Sifat nazoratini saqlashda xatolik.");
    }
  };

  const handleSaveOverhead = async (overheadItems) => {
    try {
      const updated = await updateProductionOrderOverhead(order.id, overheadItems);

      setOrder(updated);
    } catch (error) {
      alert(error.message || "Qo'shimcha xarajatlarni saqlashda xatolik.");
    }
  };

  const materialColumns = [
    {
      key: "productName",
      title: "Xomashyo",
      render: (value, material) => (
        <div className="production-order-details__material-name">
          <strong>{value}</strong>
          <span>SKU: {material.sku || "-"}</span>
        </div>
      ),
    },
    {
      key: "requiredQuantity",
      title: "Kerak",
      render: (value, material) =>
        `${formatProductionQuantity(value)} ${material.unit}`,
    },
    {
      key: "availableQuantity",
      title: "Omborda mavjud",
      render: (value, material) =>
        `${formatProductionQuantity(value)} ${material.unit}`,
    },
    {
      key: "enough",
      title: "Holat",
      render: (value) => (
        <Badge variant={value ? "success" : "danger"}>
          {value ? (
            <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />
          ) : (
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={14} />
          )}
          {value ? "Yetarli" : "Yetmaydi"}
        </Badge>
      ),
    },
    {
      key: "missingQuantity",
      title: "Yetishmaydi",
      render: (value, material) =>
        `${formatProductionQuantity(value)} ${material.unit}`,
    },
    {
      key: "totalCost",
      title: "Material qiymati",
        render: (value) => formatManufacturingMoney(value),
    },
  ];

  const handleStartStage = async (stageId) => {
    try {
      const nextStages = startProductionStage(stages, stageId);

      const updated = await updateProductionOrderStages(order.id, nextStages);

      setOrder(updated);
    } catch (error) {
      alert(error.message || "Bosqichni boshlashda xatolik.");
    }
  };

  const handleCompleteStage = async (stageId) => {
    try {
      const nextStages = completeProductionStage(stages, stageId);

      const updated = await updateProductionOrderStages(order.id, nextStages);

      setOrder(updated);
    } catch (error) {
      alert(error.message || "Bosqichni tugatishda xatolik.");
    }
  };

  const handleCompleteProduction = async (values) => {
    try {
      const updated = await completeProductionOrder({
        orderId: order.id,

        ...values,
      });

      setOrder(updated);

      setCompleteOpen(false);
    } catch (error) {
      alert(error.message || "Ishlab chiqarishni yakunlashda xatolik.");
    }
  };

  const handleOpenComplete = () => {
    const allStagesCompleted = stages.every(
      (stage) => stage.status === "COMPLETED",
    );

    if (manufacturingSettings.productionStagesRequired && !allStagesCompleted) {
      alert("Avval barcha ishlab chiqarish bosqichlarini tugating.");

      return;
    }

    if (manufacturingSettings.qualityControlRequired && !order.qualityControl) {
      alert("Avval sifat nazorati tekshiruvini bajaring.");

      return;
    }

    if (
      manufacturingSettings.blockCompletionIfQcFail &&
      order.qualityControl?.result === "FAIL"
    ) {
      alert(
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
                onClick={() => setConfirmOpen(true)}
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
          <OrderMetric
            label="Ombor"
            value={warehouse?.name || order.warehouseId}
          />
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
              label={summary.dimension === "WEIGHT" ? "Jami og'irlik" : summary.dimension === "VOLUME" ? "Jami hajm" : summary.dimension === "LENGTH" ? "Jami uzunlik" : "Jami dona"}
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

          <Table
            columns={materialColumns}
            data={availability}
            rowKey="productId"
            emptyText="Xomashyo mavjud emas."
          />

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
        description="Xomashyo real qoldiq bo'yicha tekshiriladi va yetarli bo'lsa reserved miqdori oshiriladi."
        confirmText="Boshlash"
        cancelText="Bekor qilish"
        onClose={() => setConfirmOpen(false)}
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
