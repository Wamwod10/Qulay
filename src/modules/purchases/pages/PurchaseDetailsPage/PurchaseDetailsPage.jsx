import { translateText } from "../../../../localization/i18n";import {
  ArrowDownToLine,
  ArrowLeft,
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PackageCheck,
  PackageOpen,
  Pencil,
  Truck,
  Wallet } from
"lucide-react";

import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import PurchaseReceiveModal from "../../components/PurchaseReceiveModal/PurchaseReceiveModal";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  LiveIcon,
  Table,
  Toast } from
"../../../../shared/ui";

import PurchasePaymentModal from "../../components/PurchasePaymentModal/PurchasePaymentModal";

import {
  cancelPurchase,
  fetchPurchaseById,
  getPurchaseById,
  updatePurchasePayment } from
"../../utils/purchasesStorage";

import { receivePurchaseIntoWarehouse } from "../../utils/receivePurchase";

import {
  convertCanonicalToPurchaseUnit,
  formatPurchaseMoney,
  getPurchaseDisplayQuantity,
  getPurchaseDisplayUnit,
  getPurchaseStatusLabel,
  roundPurchaseNumber,
  getPurchaseStatusVariant } from
"../../utils/purchaseHelpers";

import "./PurchaseDetailsPage.scss";

const PurchaseDetailsPage = () => {
  const navigate = useNavigate();

  const { purchaseId } = useParams();

  const [purchase, setPurchase] = useState(() => getPurchaseById(purchaseId));

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let alive = true;

    fetchPurchaseById(purchaseId)
      .then((item) => {
        if (alive) setPurchase(item);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [purchaseId]);

  if (!purchase) {
    return (
      <PageContainer
        title={translateText("Xarid topilmadi")}
        description={translateText("Bu xarid buyurtmasi mavjud emas yoki o‘chirilgan.")}>
        
        <Button variant="secondary" onClick={() => navigate("/purchases")}>{translateText("Xaridlarga qaytish")}

        </Button>
      </PageContainer>);

  }

  const canEdit =
  purchase.status === "DRAFT" || purchase.status === "ORDERED";

  const canReceive =
  purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED";

  const canCancel =
  purchase.status === "DRAFT" || purchase.status === "ORDERED";

  const canUpdatePayment =
  purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED";

  const handleCancel = async () => {
    try {
      const updatedPurchase = await cancelPurchase(purchase.id);

      setPurchase(updatedPurchase);

      setCancelConfirmOpen(false);
    } catch (error) {
      setActionError(error.message || "Xaridni bekor qilishda xatolik yuz berdi.");
    }
  };

  const handlePaymentUpdate = async (values) => {
    setPaymentSubmitting(true);
    try {
      const updatedPurchase = await updatePurchasePayment(values);

      setPurchase(updatedPurchase);

      setPaymentOpen(false);
    } catch (error) {
      setActionError(error.message || "To'lovni yangilashda xatolik yuz berdi.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const itemColumns = [
  {
    key: "productName",
    title: translateText("Mahsulot"),

    render: (value, item) =>
    <div className="purchase-details__product">
          <strong>{value || "—"}</strong>

          <span>SKU: {item.sku || "—"}</span>
        </div>

  },

  {
    key: "quantity",
    title: translateText("Buyurtma"),

    render: (_, item) =>
    <strong>
          {getPurchaseDisplayQuantity(item)} {getPurchaseDisplayUnit(item)}
        </strong>

  },

  {
    key: "receivedQuantity",
    title: translateText("Qabul qilindi"),

    render: (_, item) =>
    <span>
          {roundPurchaseNumber(convertCanonicalToPurchaseUnit(item.receivedQuantity, item))} {getPurchaseDisplayUnit(item)}
        </span>

  },

  {
    key: "remainingQuantity",
    title: translateText("Qoldi"),

    render: (_, item) =>
    <span>
          {roundPurchaseNumber(Math.max(getPurchaseDisplayQuantity(item) - convertCanonicalToPurchaseUnit(item.receivedQuantity, item), 0))} {getPurchaseDisplayUnit(item)}
        </span>

  },

  {
    key: "subtotal",
    title: translateText("Xarid narxi"),

      render: (value) => <span>{formatPurchaseMoney(value)}</span>
  },

  {
    key: "cost",
    title: translateText("Canonical tannarx"),

      render: (value, item) => <span>{formatPurchaseMoney(value)} / {item.unit}</span>
  },

  {
    key: "subtotal",
    title: translateText("Jami"),

      render: (value) => <strong>{formatPurchaseMoney(value)}</strong>
  }];


  const handleReceive = async ({ receivedItems, receivedDate, idempotencyKey }) => {
    setReceiveSubmitting(true);
    try {
      const result = await receivePurchaseIntoWarehouse({
        purchase,
        receivedItems,
        receivedDate,
        idempotencyKey,
      });

      if (result?.purchase) setPurchase(result.purchase);

      setReceiveOpen(false);
    } catch (error) {
      setActionError(error.message || "Xaridni qabul qilishda xatolik.");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  return (
    <PageContainer
      title={purchase.number}
      description={`${purchase.supplierName} · ${purchase.warehouseName}`}>
      
      {actionError && (
        <Toast
          type="error"
          title={translateText("Xatolik")}
          message={actionError}
          onClose={() => setActionError("")}
        />
      )}

      <div className="purchase-details">
        <div className="purchase-details__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/purchases")}>{translateText("Ortga")}


          </Button>

          <div className="purchase-details__action-group">
            {canEdit &&
            <Button
              variant="secondary"
              leftIcon={<Pencil size={17} />}
              onClick={() => navigate(`/purchases/${purchase.id}/edit`)}>{translateText("Tahrirlash")}


            </Button>
            }

            {canUpdatePayment &&
            <Button
              variant="secondary"
              leftIcon={<CreditCard size={17} />}
              onClick={() => setPaymentOpen(true)}>{translateText("To‘lov")}


            </Button>
            }

            {canCancel &&
            <Button
              variant="danger"
              leftIcon={<Ban size={17} />}
              onClick={() => setCancelConfirmOpen(true)}>{translateText("Bekor qilish")}


            </Button>
            }

            {canReceive &&
            <Button
              leftIcon={<ArrowDownToLine size={17} />}
              onClick={() => setReceiveOpen(true)}>{translateText("Qabul qilish")}


            </Button>
            }
          </div>
        </div>

        <section className="purchase-details__summary">
          <Card className="purchase-details__identity">
            <div className="purchase-details__identity-icon">
              <Truck size={28} />
            </div>

            <div>
              <div className="purchase-details__identity-title">
                <h2>{purchase.supplierName}</h2>

                <Badge variant={getPurchaseStatusVariant(purchase.status)}>
                  <PurchaseStatusIcon purchase={purchase} />
                  {getPurchaseStatusLabel(purchase.status)}
                </Badge>
              </div>

              <p>{purchase.warehouseName}</p>

              <span>{translateText("Buyurtma:")}{purchase.number}</span>
            </div>
          </Card>

          <PurchaseMetric
            icon={<Wallet size={20} />}
            label={translateText("Jami")}
            value={formatPurchaseMoney(purchase.total)} />
          

          <PurchaseMetric
            label={translateText("To‘langan")}
            value={formatPurchaseMoney(purchase.paidAmount)} />
          

          <PurchaseMetric
            icon={
            <LiveIcon
              icon={CircleDollarSign}
              motion="pulse-soft"
              active={Number(purchase.debtAmount || 0) > 0}
              size={20} />

            }
            label={translateText("Qarz")}
            value={formatPurchaseMoney(purchase.debtAmount)} />
          
        </section>

        <section className="purchase-details__grid">
          <Card>
            <SectionTitle
              title={translateText("Buyurtma ma’lumotlari")}
              description={translateText("Yetkazib beruvchi va qabul qiluvchi ombor.")} />
            

            <div className="purchase-details__info-grid">
              <InfoItem
                label={translateText("Yetkazib beruvchi")}
                value={purchase.supplierName} />
              

              <InfoItem
                label={translateText("Qabul qiluvchi ombor")}
                value={purchase.warehouseName} />
              

              <InfoItem label={translateText("Buyurtma sanasi")} value={purchase.orderDate} />

              <InfoItem
                label={translateText("Kutilayotgan sana")}
                value={purchase.expectedDate || "—"} />
              
            </div>
          </Card>

          <Card>
            <SectionTitle
              title={translateText("To‘lov holati")}
              description={translateText("To‘langan va qolgan qarz summasi.")} />
            

            <div className="purchase-details__info-grid">
              <InfoItem
                label={translateText("Jami")}
                value={formatPurchaseMoney(purchase.total)} />
              

              <InfoItem
                label={translateText("To‘langan")}
                value={formatPurchaseMoney(purchase.paidAmount)} />
              

              <InfoItem
                label={translateText("Qarz")}
                value={formatPurchaseMoney(purchase.debtAmount)} />
              

              <InfoItem
                label={translateText("Holat")}
                value={getPurchaseStatusLabel(purchase.status)} />
              
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle
            title={translateText("Mahsulotlar")}
            description={`${purchase.items?.length || 0} ${translateText("ta pozitsiya")}`} />
          

          <Table
            columns={itemColumns}
            data={purchase.items || []}
            rowKey="id"
            emptyText={translateText("Mahsulotlar mavjud emas.")} />
          
        </Card>

        {Array.isArray(purchase.batches) && purchase.batches.length > 0 &&
        <Card>
            <SectionTitle
            title={translateText("Batch / lot")}
            description={`${purchase.batches.length} ${translateText("ta batch")}`} />

            <Table
            columns={[
              { key: "batchNumber", title: translateText("Batch") },
              { key: "productName", title: translateText("Mahsulot") },
              {
                key: "movementQuantity",
                title: translateText("Miqdor"),
                render: (value, batch) => <span>{roundPurchaseNumber(value)} {purchase.items?.find((item) => item.productId === batch.productId)?.unit || ""}</span>
              },
              {
                key: "unitCost",
                title: translateText("Tannarx"),
                render: (value) => <span>{formatPurchaseMoney(value)}</span>
              },
              { key: "receivedDate", title: translateText("Qabul sanasi") },
              { key: "expiryDate", title: translateText("Yaroqlilik") }
            ]}
            data={purchase.batches}
            rowKey="movementId"
            emptyText={translateText("Batch mavjud emas.")} />
          </Card>
        }

        {purchase.note &&
        <Card>
            <SectionTitle
            title={translateText("Izoh")}
            description={translateText("Xarid bo‘yicha qo‘shimcha ma’lumot.")} />
          

            <div className="purchase-details__note">{purchase.note}</div>
          </Card>
        }

        {purchase.status === "RECEIVED" &&
        <Card className="purchase-details__received">
            <div className="purchase-details__received-icon">
              <LiveIcon
              icon={PackageCheck}
              motion="success-pop"
              size={24} />
            
            </div>

            <div>
              <strong>{translateText("Xarid qabul qilingan")}</strong>

              <p>
                {translateText("Mahsulotlar")} {purchase.warehouseName}{" "}
                {translateText("ombor qoldig‘iga qo‘shildi.")}
              </p>

              {purchase.receivedAt &&
            <span>
                  <CalendarDays size={13} />

                  {purchase.receivedAt}
                </span>
            }
            </div>
          </Card>
        }

        {purchase.status === "CANCELLED" &&
        <Card className="purchase-details__cancelled">
            <div className="purchase-details__cancelled-icon">
              <Ban size={24} />
            </div>

            <div>
              <strong>{translateText("Xarid bekor qilingan")}</strong>
              <p>
                {translateText(
                  "Bu buyurtma bo‘yicha omborga kirim amalga oshirilmaydi.",
                )}
              </p>
              <p>{translateText("Bu buyurtma bo‘yicha omborga kirim amalga oshirilmaydi.")}</p>

              {purchase.cancelledAt &&
            <span>
                  <CalendarDays size={13} />

                  {purchase.cancelledAt}
                </span>
            }
            </div>
          </Card>
        }
      </div>

      <PurchaseReceiveModal
        open={receiveOpen}
        purchase={purchase}
        onClose={() => setReceiveOpen(false)}
        onSubmit={handleReceive}
        submitting={receiveSubmitting} />
      

      <ConfirmDialog
        open={cancelConfirmOpen}
        title={translateText("Xaridni bekor qilish")}
        description={`"${purchase.number}" ${translateText(
          "xarid buyurtmasi bekor qilinadi. Bu amal omborga kirim qilmaydi.",
        )}`}
        confirmText={translateText("Bekor qilish")}
        danger
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancel} />
      

      <PurchasePaymentModal
        open={paymentOpen}
        purchase={purchase}
        onClose={() => setPaymentOpen(false)}
        onSubmit={handlePaymentUpdate}
        submitting={paymentSubmitting} />
      
    </PageContainer>);

};

const PurchaseMetric = ({ icon, label, value }) => {
  const metricIcon =
  icon || (
  String(label).startsWith("To") ?
  <CreditCard size={20} /> :
  label === "Qarz" ?
  <CircleDollarSign size={20} /> :
  null);

  return (
    <Card className="purchase-details__metric">
      {metricIcon &&
      <div className="purchase-details__metric-icon">{metricIcon}</div>
      }

      <span>{label}</span>

      <strong>{value}</strong>
    </Card>);

};

const isLatePurchase = (purchase) => {
  const today = new Date().toISOString().slice(0, 10);

  return Boolean(
    purchase.expectedDate &&
    purchase.expectedDate < today &&
    purchase.status !== "RECEIVED" &&
    purchase.status !== "CANCELLED"
  );
};

const PurchaseStatusIcon = ({ purchase }) => {
  if (isLatePurchase(purchase)) {
    return <LiveIcon icon={AlertTriangle} motion="warning-glow" size={14} />;
  }

  if (purchase.status === "ORDERED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={14} />;
  }

  if (purchase.status === "PARTIALLY_RECEIVED") {
    return <LiveIcon icon={PackageOpen} motion="pulse-soft" size={14} />;
  }

  if (purchase.status === "RECEIVED") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" size={14} />;
  }

  if (purchase.status === "CANCELLED") {
    return <Ban size={14} />;
  }

  return null;
};

const SectionTitle = ({ title, description }) => {
  return (
    <div className="purchase-details__section-title">
      <h3>{title}</h3>

      {description && <p>{description}</p>}
    </div>);

};

const InfoItem = ({ label, value }) => {
  return (
    <div className="purchase-details__info-item">
      <span>{label}</span>

      <strong>{value || "—"}</strong>
    </div>);

};

export default PurchaseDetailsPage;
