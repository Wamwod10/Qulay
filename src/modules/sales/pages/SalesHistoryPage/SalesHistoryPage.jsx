import { useEffect, useMemo, useState } from "react";

import { CircleDollarSign, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { getStoredCustomers } from "../../../customers/utils/customersStorage";
import { getStoredWarehouses } from "../../../warehouse/utils/warehouseManagementStorage";

import { Badge, Button, Card, DatePicker, Modal, Pagination, Select, TableToolbar, Textarea, Toast } from "../../../../shared/ui";

import SalesTable from "../../components/SalesTable/SalesTable";
import ReceiptPreview from "../../pos/components/ReceiptPreview/ReceiptPreview";

import { cancelSale, getStoredSales } from "../../utils/salesStorage";
import {
  buildSaleSearchText,
  formatSaleMoney,
} from "../../utils/salesHelpers";
import { translateText } from "../../../../localization/i18n";

import "../SalesPage/SalesPage.scss";

const PAGE_SIZE = 10;

const moneyText = (value) => formatSaleMoney(value);

const SalesHistoryPage = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState(() => getStoredSales());
  const [receiptSale, setReceiptSale] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const customers = useMemo(() => getStoredCustomers(), []);
  const agents = useMemo(() => getStoredAgents().filter((agent) => agent.status === "ACTIVE"), []);
  const warehouses = useMemo(
    () => getStoredWarehouses().filter((warehouse) => warehouse.status !== "INACTIVE"),
    [],
  );

  useEffect(() => {
    const refresh = () => setSales(getStoredSales());

    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, customerFilter, agentFilter, warehouseFilter, from, to]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = new Date(sale.completedAt || sale.orderDate || sale.createdAt);
      const saleDay = Number.isNaN(saleDate.getTime())
        ? ""
        : saleDate.toISOString().slice(0, 10);

      return (
        (!query || buildSaleSearchText(sale).includes(query)) &&
        (!statusFilter || sale.status === statusFilter) &&
        (!paymentFilter || sale.paymentStatus === paymentFilter) &&
        (!customerFilter || sale.customerId === customerFilter) &&
        (!agentFilter || sale.agentId === agentFilter) &&
        (!warehouseFilter || sale.warehouseId === warehouseFilter) &&
        (!from || saleDay >= from) &&
        (!to || saleDay <= to)
      );
    });
  }, [
    sales,
    search,
    statusFilter,
    paymentFilter,
    customerFilter,
    agentFilter,
    warehouseFilter,
    from,
    to,
  ]);

  const stats = useMemo(() => {
    const validSales = filteredSales.filter((sale) => sale.status !== "CANCELLED");

    return validSales.reduce(
      (result, sale) => ({
        count: result.count + 1,
        total: result.total + Number(sale.netTotal ?? sale.total ?? 0),
        paid: result.paid + Number(sale.paidAmount || 0),
        debt: result.debt + Number(sale.debtAmount || 0),
      }),
      {
        count: 0,
        total: 0,
        paid: 0,
        debt: 0,
      },
    );
  }, [filteredSales]);

  const totalPages = Math.max(Math.ceil(filteredSales.length / PAGE_SIZE), 1);
  const pagedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCancel = (sale) => {
    setCancelTarget(sale);
    setCancelReason("");
    setActionError("");
  };

  const submitCancel = async () => {
    if (!cancelTarget) {
      return;
    }
    setCancelLoading(true);
    try {
      await cancelSale({
        saleId: cancelTarget.id,
        reason: cancelReason,
      });
      setSales(getStoredSales());
      setCancelTarget(null);
      setCancelReason("");
    } catch (error) {
      setActionError(error.message || translateText("Savdoni bekor qilib bo'lmadi."));
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePrint = (sale) => {
    setReceiptSale(sale);
    window.setTimeout(() => window.print(), 120);
  };

  return (
    <div className="sales-page">
      {actionError && <Toast type="error" message={actionError} onClose={() => setActionError("")} />}
      <section className="sales-page__stats">
        <SaleStat icon={<ShoppingBag size={21} />} label="Sotuvlar" value={stats.count} />
        <SaleStat
          icon={<ReceiptText size={21} />}
          label="Jami savdo"
          value={moneyText(stats.total)}
        />
        <SaleStat
          icon={<CircleDollarSign size={21} />}
          label="To'langan"
          value={moneyText(stats.paid)}
          variant="success"
        />
        <SaleStat
          icon={<Wallet size={21} />}
          label="Qarz"
          value={moneyText(stats.debt)}
          variant="warning"
        />
      </section>

      <Card padding="md" className="sales-page__workspace">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={translateText("Sotuv, SKU, mijoz, agent...")}
          actionLabel={translateText("POS terminal")}
          actionIcon={<ShoppingBag size={17} />}
          onAction={() => navigate("/sales/terminal")}
        />

        <div className="sales-page__filters sales-page__filters--wide">
          <Select
            value={statusFilter}
            placeholder={translateText("Barcha holatlar")}
            options={[
              { value: "", label: translateText("Barcha holatlar") },
              { value: "DRAFT", label: translateText("Qoralama") },
              { value: "COMPLETED", label: translateText("Yakunlangan") },
              { value: "CANCELLED", label: translateText("Bekor qilingan") },
            ]}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <Select
            value={paymentFilter}
            placeholder={translateText("Barcha to'lovlar")}
            options={[
              { value: "", label: translateText("Barcha to'lovlar") },
              { value: "UNPAID", label: translateText("To'lanmagan") },
              { value: "PARTIAL", label: translateText("Qisman") },
              { value: "PAID", label: translateText("To'langan") },
            ]}
            onChange={(event) => setPaymentFilter(event.target.value)}
          />
          <Select
            value={customerFilter}
            placeholder={translateText("Barcha mijozlar")}
            options={[
              { value: "", label: translateText("Barcha mijozlar") },
              ...customers.map((customer) => ({
                value: customer.id,
                label: customer.name || customer.phone || customer.id,
              })),
            ]}
            onChange={(event) => setCustomerFilter(event.target.value)}
          />
          <Select
            value={agentFilter}
            placeholder={translateText("Barcha agentlar")}
            options={[
              { value: "", label: translateText("Barcha agentlar") },
              ...agents.map((agent) => ({
                value: agent.id,
                label: agent.name || agent.phone || agent.id,
              })),
            ]}
            onChange={(event) => setAgentFilter(event.target.value)}
          />
          <Select
            value={warehouseFilter}
            placeholder={translateText("Barcha omborlar")}
            options={[
              { value: "", label: translateText("Barcha omborlar") },
              ...warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              })),
            ]}
            onChange={(event) => setWarehouseFilter(event.target.value)}
          />
          <DatePicker value={from} placeholder={translateText("Boshlanish")} onChange={(event) => setFrom(event.target.value)} />
          <DatePicker value={to} placeholder={translateText("Tugash")} onChange={(event) => setTo(event.target.value)} />
        </div>

        <SalesTable
          sales={pagedSales}
          onView={(sale) => navigate(`/sales/history/${sale.id}`)}
          onReceipt={setReceiptSale}
          onPrint={handlePrint}
          onReturn={(sale) => navigate(`/sales/history/${sale.id}`)}
          onCancel={openCancel}
        />

        <div className="sales-page__pagination">
          <Badge variant="neutral">{filteredSales.length} {translateText("ta natija")}</Badge>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </Card>

      <Modal
        open={Boolean(receiptSale)}
        title={translateText("Chek")}
        size="sm"
        onClose={() => setReceiptSale(null)}
      >
        <ReceiptPreview sale={receiptSale} onPrint={() => window.print()} />
      </Modal>
      <Modal
        open={Boolean(cancelTarget)}
        title={translateText("Savdoni bekor qilish")}
        description={translateText("Bekor qilish ombor, moliya va mijoz qarziga teskari yozuvlar bilan ta'sir qiladi.")}
        size="sm"
        onClose={() => {
          if (!cancelLoading) {
            setCancelTarget(null);
          }
        }}
        footer={
          <>
            <Button variant="secondary" disabled={cancelLoading} onClick={() => setCancelTarget(null)}>
              {translateText("Bekor qilish")}
            </Button>
            <Button variant="danger" loading={cancelLoading} onClick={submitCancel}>
              {translateText("Savdoni bekor qilish")}
            </Button>
          </>
        }
      >
        <Textarea
          label={translateText("Sabab")}
          value={cancelReason}
          rows={4}
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>
    </div>
  );
};

const SaleStat = ({ icon, label, value, variant }) => (
  <Card variant="soft" padding="md" className="sales-page__stat">
    <div
      className={[
        "sales-page__stat-icon",
        variant ? `sales-page__stat-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </div>

    <div>
      <span>{translateText(label)}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

export default SalesHistoryPage;
