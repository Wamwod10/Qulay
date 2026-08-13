import { Printer } from "lucide-react";

import { Button } from "../../../../../shared/ui";

import {
  formatSaleDate,
  formatSaleMoney,
  getPaymentMethodLabel,
} from "../../../utils/salesHelpers";

import "./ReceiptPreview.scss";

const ReceiptPreview = ({ sale, onPrint }) => {
  if (!sale) {
    return null;
  }

  return (
    <div className="sales-receipt">
      <div className="sales-receipt__paper">
        <header>
          <strong>UNIVERSAL ERP POS</strong>
          <span>Receipt / Chek</span>
        </header>

        <div className="sales-receipt__meta">
          <span>Sotuv: {sale.number}</span>
          <span>Sana: {formatSaleDate(sale.completedAt || sale.createdAt)}</span>
          <span>Mijoz: {sale.customerName || "Mijozsiz"}</span>
          <span>Agent: {sale.agentName || "-"}</span>
          <span>Ombor: {sale.warehouseName || "-"}</span>
        </div>

        <div className="sales-receipt__items">
          {(sale.items || []).map((item) => (
            <div key={`${item.productId}-${item.id}`} className="sales-receipt__item">
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.quantity} {item.unit} x {formatSaleMoney(item.price)}
                </span>
              </div>
              <b>{formatSaleMoney(item.subtotal)}</b>
            </div>
          ))}
        </div>

        <div className="sales-receipt__totals">
          <span>
            Subtotal <b>{formatSaleMoney(sale.subtotal)} so'm</b>
          </span>
          <span>
            Discount <b>-{formatSaleMoney(sale.discount)} so'm</b>
          </span>
          <strong>
            Total <b>{formatSaleMoney(sale.total)} so'm</b>
          </strong>
          <span>
            Paid <b>{formatSaleMoney(sale.paidAmount)} so'm</b>
          </span>
          <span>
            Debt <b>{formatSaleMoney(sale.debtAmount)} so'm</b>
          </span>
        </div>

        <div className="sales-receipt__payments">
          {(sale.payments || []).length ? (
            sale.payments.map((payment) => (
              <span key={payment.id}>
                {getPaymentMethodLabel(payment.method)}: {formatSaleMoney(payment.amount)} so'm
              </span>
            ))
          ) : (
            <span>To'lov kiritilmagan</span>
          )}
        </div>

        {sale.note && <p className="sales-receipt__note">{sale.note}</p>}
      </div>

      <Button leftIcon={<Printer size={17} />} onClick={onPrint}>
        Print
      </Button>
    </div>
  );
};

export default ReceiptPreview;
