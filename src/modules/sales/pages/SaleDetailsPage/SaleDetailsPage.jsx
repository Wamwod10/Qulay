import { useMemo, useState } from "react";

import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Printer,
  ReceiptText,
  RotateCcw,
  UserRound,
  Warehouse,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Badge, Button, Card, Input, LiveIcon, Modal, Table, Textarea } from "../../../../shared/ui";

import ReceiptPreview from "../../pos/components/ReceiptPreview/ReceiptPreview";

import { getReturnedQuantityForItem, roundMoney } from "../../utils/salesCalculations";
import { cancelSale, getSaleById, returnSaleItems } from "../../utils/salesStorage";
import {
  formatSaleDate,
  formatSaleMoney,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getReturnStatusLabel,
  getSaleStatusLabel,
  getSaleStatusVariant,
} from "../../utils/salesHelpers";

import "./SaleDetailsPage.scss";

const SaleDetailsPage = () => {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnRows, setReturnRows] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [error, setError] = useState("");

  const sale = useMemo(() => getSaleById(saleId), [saleId, refreshKey]);

  if (!sale) {
    return (
      <div className="sale-details">
        <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/sales/history")}>
          Savdolarga qaytish
        </Button>
        <Card padding="lg">Savdo topilmadi.</Card>
      </div>
    );
  }

  const canReturn = sale.status === "COMPLETED";
  const canCancel = sale.status === "COMPLETED";

  const itemColumns = [
    { key: "productName", title: "Mahsulot" },
    { key: "sku", title: "SKU" },
    {
      key: "quantity",
      title: "Miqdor",
      render: (value, item) => `${value} ${item.unit}`,
    },
    {
      key: "price",
      title: "Narx",
      render: (value) => formatSaleMoney(value),
    },
    {
      key: "subtotal",
      title: "Jami",
      render: (value) => formatSaleMoney(value),
    },
    {
      key: "returned",
      title: "Qaytarilgan",
      render: (_, item) => `${getReturnedQuantityForItem(sale, item.productId)} ${item.unit}`,
    },
  ];

  const handleCancel = async () => {
    const reason = window.prompt("Bekor qilish sababi:");

    if (reason === null) {
      return;
    }

    try {
      await cancelSale({
        saleId: sale.id,
        reason,
      });
      setRefreshKey((current) => current + 1);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const submitReturn = async () => {
    setError("");

    try {
      const items = Object.entries(returnRows).map(([productId, row]) => ({
        productId,
        quantity: Number(row.quantity || 0),
        refundAmount: Number(row.refundAmount || 0),
        reason: row.reason || returnReason,
      }));

      await returnSaleItems({
        saleId: sale.id,
        items,
        reason: returnReason,
      });
      setReturnRows({});
      setReturnReason("");
      setReturnOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const updateReturnRow = (productId, patch) => {
    setReturnRows((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] || {}),
        ...patch,
      },
    }));
  };

  return (
    <div className="sale-details">
      <div className="sale-details__actions">
        <Button variant="secondary" leftIcon={<ArrowLeft size={17} />} onClick={() => navigate("/sales/history")}>
          Ortga
        </Button>
        <Button leftIcon={<ReceiptText size={17} />} onClick={() => setReceiptOpen(true)}>
          Chek
        </Button>
        <Button leftIcon={<Printer size={17} />} onClick={() => window.print()}>
          Print
        </Button>
        <Button
          variant="secondary"
          leftIcon={<RotateCcw size={17} />}
          disabled={!canReturn}
          onClick={() => setReturnOpen(true)}
        >
          Qaytarish
        </Button>
        <Button variant="danger" leftIcon={<Ban size={17} />} disabled={!canCancel} onClick={handleCancel}>
          Bekor qilish
        </Button>
      </div>

      {error && (
        <div className="sale-details__error">
          <LiveIcon icon={Ban} motion="danger-breathe" size={16} />
          {error}
        </div>
      )}

      <section className="sale-details__summary">
        <Card className="sale-details__identity">
          <div className="sale-details__identity-icon">
            <ReceiptText size={23} />
          </div>
          <div>
            <h2>{sale.number}</h2>
            <div className="sale-details__badges">
              <Badge variant={getSaleStatusVariant(sale.status)}>
                {getSaleStatusLabel(sale.status)}
              </Badge>
              <Badge variant={getPaymentStatusVariant(sale.paymentStatus)}>
                {getPaymentStatusLabel(sale.paymentStatus)}
              </Badge>
              {sale.returnStatus && (
                <Badge variant="warning">{getReturnStatusLabel(sale.returnStatus)}</Badge>
              )}
            </div>
          </div>
        </Card>
        <Metric label="Total" value={formatSaleMoney(sale.total)} />
        <Metric label="Paid" value={formatSaleMoney(sale.paidAmount)} />
        <Metric label="Debt" value={formatSaleMoney(sale.debtAmount)} />
      </section>

      <section className="sale-details__grid">
        <Card padding="lg">
          <SectionTitle title="Bog'lanishlar" />
          <Info icon={<UserRound size={17} />} label="Mijoz" value={sale.customerName || "Mijozsiz"} />
          <Info icon={<UserRound size={17} />} label="Agent" value={sale.agentName || "-"} />
          <Info icon={<Warehouse size={17} />} label="Ombor" value={sale.warehouseName || "-"} />
          <Info icon={<CalendarDays size={17} />} label="Sana" value={formatSaleDate(sale.completedAt || sale.createdAt)} />
        </Card>
        <Card padding="lg">
          <SectionTitle title="To'lovlar" />
          <div className="sale-details__payments">
            {(sale.payments || []).length ? (
              sale.payments.map((payment) => (
                <span key={payment.id}>
                  {getPaymentMethodLabel(payment.method)}
                  <b>{formatSaleMoney(payment.amount)}</b>
                </span>
              ))
            ) : (
              <span>To'lov yo'q</span>
            )}
          </div>
        </Card>
      </section>

      <Card padding="lg" className="sale-details__section">
        <SectionTitle title="Mahsulotlar" />
        <Table columns={itemColumns} data={sale.items} rowKey="id" />
      </Card>

      <Card padding="lg" className="sale-details__section">
        <SectionTitle title="Summary" />
        <div className="sale-details__totals">
          <span>Subtotal <b>{formatSaleMoney(sale.subtotal)}</b></span>
          <span>Discount <b>-{formatSaleMoney(sale.discount)}</b></span>
          <span>Qaytarilgan <b>-{formatSaleMoney(sale.returnedAmount)}</b></span>
          <strong>Sof jami <b>{formatSaleMoney(sale.netTotal)}</b></strong>
        </div>
        {sale.note && <p className="sale-details__note">{sale.note}</p>}
      </Card>

      {(sale.returns || []).length > 0 && (
        <Card padding="lg" className="sale-details__section">
          <SectionTitle title="Qaytarish tarixi" />
          <Table
            columns={[
              { key: "productName", title: "Mahsulot" },
              { key: "quantity", title: "Miqdor", render: (value, row) => `${value} ${row.unit}` },
              { key: "refundAmount", title: "Qaytariladigan summa", render: (value) => formatSaleMoney(value) },
              { key: "reason", title: "Sabab", render: (value) => value || "-" },
              { key: "createdAt", title: "Sana", render: formatSaleDate },
            ]}
            data={sale.returns}
            rowKey="id"
          />
        </Card>
      )}

      <Modal open={receiptOpen} title="Chek" size="sm" onClose={() => setReceiptOpen(false)}>
        <ReceiptPreview sale={sale} onPrint={() => window.print()} />
      </Modal>

      <Modal
        open={returnOpen}
        title="Qaytarish"
        description="Sotilgan miqdordan oshmagan qisman qaytarish miqdorini kiriting."
        size="lg"
        onClose={() => setReturnOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>Bekor</Button>
            <Button leftIcon={<RotateCcw size={17} />} onClick={submitReturn}>Qaytarish</Button>
          </>
        }
      >
        <div className="sale-details__return">
          {sale.items.map((item) => {
            const returned = getReturnedQuantityForItem(sale, item.productId);
            const available = Math.max(Number(item.quantity || 0) - returned, 0);
            const row = returnRows[item.productId] || {};

            return (
              <div key={item.productId} className="sale-details__return-row">
                <div>
                  <strong>{item.productName}</strong>
                  <span>Qolgan: {available} {item.unit}</span>
                </div>
                <Input
                  value={row.quantity || ""}
                  inputMode="decimal"
                  placeholder="Miqdor"
                  onChange={(event) => {
                    const quantity = Number(event.target.value || 0);
                    updateReturnRow(item.productId, {
                      quantity: event.target.value,
                      refundAmount: quantity > 0 ? roundMoney(quantity * item.price) : "",
                    });
                  }}
                />
                <Input
                  value={row.refundAmount || ""}
                  inputMode="decimal"
                  placeholder="Qaytariladigan summa"
                  onChange={(event) => updateReturnRow(item.productId, { refundAmount: event.target.value })}
                />
              </div>
            );
          })}
          <Textarea
            label="Sabab"
            value={returnReason}
            rows={3}
            onChange={(event) => setReturnReason(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <Card className="sale-details__metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </Card>
);

const SectionTitle = ({ title }) => (
  <div className="sale-details__section-title">
    <h3>{title}</h3>
  </div>
);

const Info = ({ icon, label, value }) => (
  <div className="sale-details__info">
    <div>{icon}</div>
    <span>
      <small>{label}</small>
      <strong>{value || "-"}</strong>
    </span>
  </div>
);

export default SaleDetailsPage;
