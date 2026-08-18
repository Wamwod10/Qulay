import { Printer } from "lucide-react";

import { Button } from "../../../../../shared/ui";

import {
  formatSaleDate,
  formatSaleMoney,
  getPaymentMethodLabel,
} from "../../../utils/salesHelpers";
import { translateText } from "../../../../../localization/i18n";

import "./ReceiptPreview.scss";

const ReceiptPreview = ({ sale, settings = {}, onPrint }) => {
  if (!sale) {
    return null;
  }

  const moneyText = (value) => `${formatSaleMoney(value)} ${translateText("so'm")}`;

  return (
    <div className="sales-receipt">
      <div
        className="sales-receipt__paper"
        style={{
          "--receipt-width": settings.receiptWidth || "80mm",
        }}
      >
        <header>
          <strong>{settings.receiptHeader || "UNIVERSAL ERP POS"}</strong>
          <span>{translateText("Receipt / Chek")}</span>
        </header>

        <div className="sales-receipt__meta">
          <span>{translateText("Sotuv")}: {sale.number}</span>
          <span>{translateText("Sana")}: {formatSaleDate(sale.completedAt || sale.createdAt)}</span>
          {settings.showCustomerOnReceipt !== false && (
            <span>{translateText("Mijoz")}: {sale.customerName || translateText("Mijozsiz")}</span>
          )}
          {settings.showAgentOnReceipt !== false && (
            <span>{translateText("Agent")}: {sale.agentName || "-"}</span>
          )}
          <span>{translateText("Ombor")}: {sale.warehouseName || "-"}</span>
        </div>

        <div className="sales-receipt__items">
          {(sale.items || []).map((item) => (
            <div key={`${item.productId}-${item.id}`} className="sales-receipt__item">
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.quantity} {translateText(item.unit)} x {formatSaleMoney(item.price)}
                </span>
              </div>
              <b>{formatSaleMoney(item.subtotal)}</b>
            </div>
          ))}
        </div>

        <div className="sales-receipt__totals">
          <span>
            {translateText("Subtotal")} <b>{moneyText(sale.subtotal)}</b>
          </span>
          <span>
            {translateText("Discount")} <b>-{moneyText(sale.discount)}</b>
          </span>
          <strong>
            {translateText("Total")} <b>{moneyText(sale.total)}</b>
          </strong>
          <span>
            {translateText("To'langan")} <b>{moneyText(sale.paidAmount)}</b>
          </span>
          <span>
            {translateText("Qarz")} <b>{moneyText(sale.debtAmount)}</b>
          </span>
        </div>

        <div className="sales-receipt__payments">
          {(sale.payments || []).length ? (
            sale.payments.map((payment) => (
              <span key={payment.id}>
                {getPaymentMethodLabel(payment.method)}: {moneyText(payment.amount)}
              </span>
            ))
          ) : (
            <span>{translateText("To'lov kiritilmagan")}</span>
          )}
        </div>

        {sale.note && <p className="sales-receipt__note">{sale.note}</p>}

        {settings.receiptFooter && (
          <p className="sales-receipt__footer">{settings.receiptFooter}</p>
        )}
      </div>

      <Button leftIcon={<Printer size={17} />} onClick={onPrint}>
        {translateText("Print")}
      </Button>
    </div>
  );
};

export default ReceiptPreview;
