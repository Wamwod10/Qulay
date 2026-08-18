import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CircleDollarSign, Eye, HandCoins, MoreHorizontal, Pencil, Plus, ReceiptText, UserCheck, Users, Wallet } from "lucide-react";
import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Card, LiveIcon, Pagination, Select, Table, TableToolbar } from "../../../../shared/ui";
import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { formatSaleDate, formatSaleMoney } from "../../../sales/utils/salesHelpers";
import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import { useNotificationSettings, useTableSettings, useTerminology } from "../../../settings/selectors/settingsSelectors";
import { buildCustomerListRows, getCustomerDeleteSafety } from "../../utils/customerSelectors";
import { deactivateCustomer, deleteCustomer, updateCustomer } from "../../utils/customersStorage";
import "./CustomersPage.scss";
import { translateText } from "../../../../localization/i18n";
const PAGE_SIZE = 10;
const CustomersPage = () => {
  const navigate = useNavigate();
  const {
    tTerm
  } = useTerminology();
  const notifications = useNotificationSettings();
  const customerTableSettings = useTableSettings("customers");
  const pageSize = customerTableSettings.defaultPageSize || PAGE_SIZE;
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [debtFilter, setDebtFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState("");
  useEffect(() => {
    const refresh = () => setVersion(current => current + 1);
    window.addEventListener("customers:changed", refresh);
    window.addEventListener("finance:changed", refresh);
    window.addEventListener("sales:changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("customers:changed", refresh);
      window.removeEventListener("finance:changed", refresh);
      window.removeEventListener("sales:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const rows = useMemo(() => buildCustomerListRows(), [version]);
  const agents = useMemo(() => getStoredAgents(), [version]);
  const regions = useMemo(() => [...new Set(rows.map(customer => customer.region).filter(Boolean))], [rows]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, agentFilter, segmentFilter, debtFilter, regionFilter]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(customer => {
      const searchText = [customer.name, customer.fullName, customer.companyName, customer.contactPerson, customer.phone, customer.email].filter(Boolean).join(" ").toLowerCase();
      return (!query || searchText.includes(query)) && (!statusFilter || customer.status === statusFilter) && (!typeFilter || customer.type === typeFilter) && (!agentFilter || customer.agentId === agentFilter) && (!segmentFilter || customer.segment === segmentFilter) && (!regionFilter || customer.region === regionFilter) && (!debtFilter || debtFilter === "WITH_DEBT" && customer.debtAmount > 0 || debtFilter === "NO_DEBT" && customer.debtAmount <= 0 || debtFilter === "OVER_LIMIT" && customer.credit.exceeded);
    });
  }, [agentFilter, debtFilter, regionFilter, rows, search, segmentFilter, statusFilter, typeFilter]);
  const stats = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return rows.reduce((result, customer) => {
      const createdAt = new Date(customer.createdAt);
      return {
        total: result.total + 1,
        active: result.active + (customer.status === "ACTIVE" ? 1 : 0),
        sales: result.sales + Number(customer.salesAmount || 0),
        debt: result.debt + Number(customer.debtAmount || 0),
        newCustomers: result.newCustomers + (!Number.isNaN(createdAt.getTime()) && createdAt.getTime() >= thirtyDaysAgo ? 1 : 0),
        debtors: result.debtors + (customer.debtAmount > 0 ? 1 : 0)
      };
    }, {
      total: 0,
      active: 0,
      sales: 0,
      debt: 0,
      newCustomers: 0,
      debtors: 0
    });
  }, [rows]);
  const topCustomers = useMemo(() => [...rows].filter(customer => customer.salesAmount > 0).sort((a, b) => b.salesAmount - a.salesAmount).slice(0, 5), [rows]);
  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const refresh = () => setVersion(current => current + 1);
  const handleDelete = async customer => {
    const safety = getCustomerDeleteSafety(customer.id);
    if (!safety.canDelete) {
      window.alert(`${translateText("Mijoz tarixi mavjud")}: ${safety.blockingReasons.join(", ")}. ${translateText("O'chirish o'rniga faol emas qilindi.")}`);
      await deactivateCustomer(customer.id);
      refresh();
      return;
    }
    if (window.confirm(`${customer.displayName} ${translateText("o'chirilsinmi?")}`)) {
      await deleteCustomer(customer.id);
      refresh();
    }
  };
  const handleStatusToggle = async customer => {
    await updateCustomer({
      ...customer,
      status: customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    });
    setActionMenuId("");
    refresh();
  };
  const columns = [{
    key: "customer",
    title: tTerm("customer"),
    render: (_, row) => <button type="button" className="customers-page__customer-link" onClick={() => navigate(`/customers/${row.id}`)}>
          <strong>{row.displayName}</strong>
          <span>
            {row.companyName && row.companyName !== row.displayName ? row.companyName : row.email || "-"}
          </span>
        </button>
  }, {
    key: "phone",
    title: translateText("Telefon"),
    render: value => value || "-"
  }, {
    key: "agent",
    title: tTerm("agent"),
    render: (_, row) => row.agentName || "-"
  }, {
    key: "sales",
    title: translateText("Savdo"),
    render: (_, row) => `${formatSaleMoney(row.salesAmount)} ${translateText("so'm")}`
  }, {
    key: "debt",
    title: tTerm("debt"),
    render: (_, row) => <span className={row.credit.exceeded ? "customers-page__danger" : ""}>
          {notifications.customerDebtWarning && row.debtAmount > 0 && <LiveIcon icon={AlertTriangle} motion={row.credit.exceeded ? "danger-breathe" : "warning-glow"} size={13} />}
          {formatSaleMoney(row.debtAmount)} {translateText("so'm")}</span>
  }, {
    key: "lastSale",
    title: translateText("Oxirgi savdo"),
    render: value => value ? formatSaleDate(value.completedAt || value.orderDate || value.createdAt) : "-"
  }, {
    key: "segment",
    title: translateText("Toifa"),
    render: (value, row) => <Badge variant={row.score.variant}>{translateText(value)}</Badge>
  }, {
    key: "status",
    title: translateText("Holat"),
    render: value => <Badge variant={value === "ACTIVE" ? "success" : "neutral"}>{translateText(value)}</Badge>
  }, {
    key: "actions",
    title: translateText("Amallar"),
    render: (_, row) => <div className="customers-page__actions">
          <button type="button" title={translateText("Ko'rish")} onClick={() => navigate(`/customers/${row.id}`)}>
            <Eye size={15} />
          </button>
          <button type="button" title={translateText("Tahrirlash")} onClick={() => navigate(`/customers/${row.id}/edit`)}>
            <Pencil size={15} />
          </button>
          <button type="button" title={translateText("Yangi savdo")} onClick={() => navigate(`/sales/terminal?customerId=${row.id}`)}>
            <ReceiptText size={15} />
          </button>
          <button type="button" title={translateText("To'lov qabul qilish")} onClick={() => navigate(`/customers/${row.id}?pay=1`)}>
            <HandCoins size={15} />
          </button>
          <button type="button" title={translateText("Amallar menyusi")} onClick={() => setActionMenuId(current => current === row.id ? "" : row.id)}>
            <MoreHorizontal size={15} />
          </button>
          {actionMenuId === row.id && <div className="customers-page__menu">
              <button type="button" onClick={() => navigate(`/customers/${row.id}`)}>{translateText("Ko'rish")}</button>
              <button type="button" onClick={() => navigate(`/customers/${row.id}/edit`)}>{translateText("Tahrirlash")}</button>
              <button type="button" onClick={() => navigate(`/sales/terminal?customerId=${row.id}`)}>{translateText("Yangi savdo")}</button>
              <button type="button" onClick={() => navigate(`/customers/${row.id}?pay=1`)}>{translateText("To'lov qabul qilish")}</button>
              <button type="button" onClick={() => navigate(`/customers/${row.id}?follow=1`)}>{translateText("Keyingi aloqa")}</button>
              <button type="button" onClick={() => handleStatusToggle(row)}>
                {row.status === "ACTIVE" ? translateText("Faol emas qilish") : translateText("Faol qilish")}
              </button>
              <button type="button" onClick={() => handleDelete(row)}>
                {getCustomerDeleteSafety(row.id).canDelete ? translateText("O'chirish") : translateText("Faol emas qilish")}
              </button>
            </div>}
        </div>
  }];
  const configuredColumns = useConfiguredColumns("customers", columns);
  return <PageContainer title={tTerm("customers")} description={translateText("CRM mijozlar markazi: savdo, moliya va agentlarning real ma'lumotlari asosida.")}>
      <div className="customers-page">
        <section className="customers-page__kpis">
          <Metric icon={<Users size={20} />} label={translateText("Jami mijoz")} value={stats.total} />
          <Metric icon={<UserCheck size={20} />} label={translateText("Faol mijoz")} value={stats.active} variant="success" />
          <Metric icon={<CircleDollarSign size={20} />} label={translateText("Jami savdo")} value={`${formatSaleMoney(stats.sales)} ${translateText("so'm")}`} />
          <Metric icon={<Wallet size={20} />} label={translateText("Jami qarz")} value={`${formatSaleMoney(stats.debt)} ${translateText("so'm")}`} variant="warning" active={stats.debt > 0} />
          <Metric icon={<Plus size={20} />} label={translateText("Yangi mijozlar")} value={stats.newCustomers} />
          <Metric icon={<AlertTriangle size={20} />} label={translateText("Qarzdor mijozlar")} value={stats.debtors} variant="danger" active={stats.debtors > 0} />
        </section>

        <Card padding="md" className="customers-page__table">
          <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder={translateText("Ism, kompaniya, telefon, email...")} actionLabel={translateText("Yangi mijoz")} actionIcon={<Plus size={17} />} onAction={() => navigate("/customers/create")} />

          <div className="customers-page__filters">
            <Select value={statusFilter} placeholder={translateText("Barcha holatlar")} options={[{
            value: "",
            label: translateText("Barcha holatlar")
          }, {
            value: "ACTIVE",
            label: translateText("Faol")
          }, {
            value: "INACTIVE",
            label: translateText("Faol emas")
          }]} onChange={event => setStatusFilter(event.target.value)} />
            <Select value={typeFilter} placeholder={translateText("Barcha turlar")} options={[{
            value: "",
            label: translateText("Barcha turlar")
          }, {
            value: "INDIVIDUAL",
            label: translateText("Jismoniy shaxs")
          }, {
            value: "COMPANY",
            label: translateText("Kompaniya")
          }]} onChange={event => setTypeFilter(event.target.value)} />
            <Select value={agentFilter} placeholder={translateText("Barcha agentlar")} options={[{
            value: "",
            label: translateText("Barcha agentlar")
          }, ...agents.map(agent => ({
            value: agent.id,
            label: agent.name || agent.phone || agent.id
          }))]} onChange={event => setAgentFilter(event.target.value)} />
            <Select value={segmentFilter} placeholder={translateText("Barcha toifalar")} options={[{
            value: "",
            label: translateText("Barcha toifalar")
          }, {
            value: "VIP",
            label: translateText("VIP")
          }, {
            value: "REGULAR",
            label: translateText("Doimiy")
          }, {
            value: "NEW",
            label: translateText("Yangi")
          }, {
            value: "RISK",
            label: translateText("Riskli")
          }, {
            value: "INACTIVE",
            label: translateText("Faol emas")
          }]} onChange={event => setSegmentFilter(event.target.value)} />
            <Select value={debtFilter} placeholder={translateText("Qarz holati")} options={[{
            value: "",
            label: translateText("Qarz holati")
          }, {
            value: "WITH_DEBT",
            label: translateText("Qarzdor")
          }, {
            value: "NO_DEBT",
            label: translateText("Qarzsiz")
          }, {
            value: "OVER_LIMIT",
            label: translateText("Limitdan oshgan")
          }]} onChange={event => setDebtFilter(event.target.value)} />
            <Select value={regionFilter} placeholder={translateText("Barcha regionlar")} options={[{
            value: "",
            label: translateText("Barcha regionlar")
          }, ...regions.map(region => ({
            value: region,
            label: region
          }))]} onChange={event => setRegionFilter(event.target.value)} />
          </div>

          <Table columns={configuredColumns} data={pagedRows} rowKey="id" emptyText={translateText("Mijozlar mavjud emas.")} />

          <div className="customers-page__pagination">
            <Badge variant="neutral">{filteredRows.length} {translateText("ta natija")}</Badge>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </Card>

        {topCustomers.length > 0 && <Card padding="md" className="customers-page__top">
            <h3>{translateText("Eng faol 5 mijoz")}</h3>
            <div>
              {topCustomers.map(customer => <button key={customer.id} type="button" onClick={() => navigate(`/customers/${customer.id}`)}>
                  <span>{customer.displayName}</span>
                  <strong>{formatSaleMoney(customer.salesAmount)} {translateText("so'm")}</strong>
                </button>)}
            </div>
          </Card>}
      </div>
    </PageContainer>;
};
const Metric = ({
  icon,
  label,
  value,
  variant = "",
  active = false
}) => <Card variant="soft" padding="md" className="customers-page__metric">
    <div className={["customers-page__metric-icon", variant ? `customers-page__metric-icon--${variant}` : ""].filter(Boolean).join(" ")}>
      {active && icon.type ? <LiveIcon icon={icon.type} motion={variant === "danger" ? "danger-breathe" : "warning-glow"} size={20} /> : icon}
    </div>
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </Card>;
export default CustomersPage;
