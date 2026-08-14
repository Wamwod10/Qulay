import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  CircleDollarSign,
  Eye,
  HandCoins,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { Badge, Card, LiveIcon, Pagination, Select, Table, TableToolbar } from "../../../../shared/ui";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { formatSaleDate, formatSaleMoney } from "../../../sales/utils/salesHelpers";

import { buildCustomerListRows, getCustomerDeleteSafety } from "../../utils/customerSelectors";
import { deactivateCustomer, deleteCustomer, updateCustomer } from "../../utils/customersStorage";

import "./CustomersPage.scss";

const PAGE_SIZE = 10;

const CustomersPage = () => {
  const navigate = useNavigate();
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
    const refresh = () => setVersion((current) => current + 1);

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
  const regions = useMemo(
    () => [...new Set(rows.map((customer) => customer.region).filter(Boolean))],
    [rows],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, agentFilter, segmentFilter, debtFilter, regionFilter]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((customer) => {
      const searchText = [
        customer.name,
        customer.fullName,
        customer.companyName,
        customer.contactPerson,
        customer.phone,
        customer.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchText.includes(query)) &&
        (!statusFilter || customer.status === statusFilter) &&
        (!typeFilter || customer.type === typeFilter) &&
        (!agentFilter || customer.agentId === agentFilter) &&
        (!segmentFilter || customer.segment === segmentFilter) &&
        (!regionFilter || customer.region === regionFilter) &&
        (!debtFilter ||
          (debtFilter === "WITH_DEBT" && customer.debtAmount > 0) ||
          (debtFilter === "NO_DEBT" && customer.debtAmount <= 0) ||
          (debtFilter === "OVER_LIMIT" && customer.credit.exceeded))
      );
    });
  }, [
    agentFilter,
    debtFilter,
    regionFilter,
    rows,
    search,
    segmentFilter,
    statusFilter,
    typeFilter,
  ]);

  const stats = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;

    return rows.reduce(
      (result, customer) => {
        const createdAt = new Date(customer.createdAt);

        return {
          total: result.total + 1,
          active: result.active + (customer.status === "ACTIVE" ? 1 : 0),
          sales: result.sales + Number(customer.salesAmount || 0),
          debt: result.debt + Number(customer.debtAmount || 0),
          newCustomers:
            result.newCustomers +
            (!Number.isNaN(createdAt.getTime()) && createdAt.getTime() >= thirtyDaysAgo ? 1 : 0),
          debtors: result.debtors + (customer.debtAmount > 0 ? 1 : 0),
        };
      },
      {
        total: 0,
        active: 0,
        sales: 0,
        debt: 0,
        newCustomers: 0,
        debtors: 0,
      },
    );
  }, [rows]);

  const topCustomers = useMemo(
    () => [...rows].filter((customer) => customer.salesAmount > 0).sort((a, b) => b.salesAmount - a.salesAmount).slice(0, 5),
    [rows],
  );

  const totalPages = Math.max(Math.ceil(filteredRows.length / PAGE_SIZE), 1);
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refresh = () => setVersion((current) => current + 1);

  const handleDelete = (customer) => {
    const safety = getCustomerDeleteSafety(customer.id);

    if (!safety.canDelete) {
      window.alert(`Customer history mavjud: ${safety.blockingReasons.join(", ")}. Delete o'rniga inactive qilindi.`);
      deactivateCustomer(customer.id);
      refresh();
      return;
    }

    if (window.confirm(`${customer.displayName} o'chirilsinmi?`)) {
      deleteCustomer(customer.id);
      refresh();
    }
  };

  const handleStatusToggle = (customer) => {
    updateCustomer({
      ...customer,
      status: customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setActionMenuId("");
    refresh();
  };

  return (
    <PageContainer
      title="Mijozlar"
      description="CRM customer center: Sales, Finance va Agents real data asosida."
    >
      <div className="customers-page">
        <section className="customers-page__kpis">
          <Metric icon={<Users size={20} />} label="Jami mijoz" value={stats.total} />
          <Metric icon={<UserCheck size={20} />} label="Faol mijoz" value={stats.active} variant="success" />
          <Metric
            icon={<CircleDollarSign size={20} />}
            label="Jami savdo"
            value={`${formatSaleMoney(stats.sales)} so'm`}
          />
          <Metric
            icon={<Wallet size={20} />}
            label="Jami qarz"
            value={`${formatSaleMoney(stats.debt)} so'm`}
            variant="warning"
            active={stats.debt > 0}
          />
          <Metric icon={<Plus size={20} />} label="Yangi mijozlar" value={stats.newCustomers} />
          <Metric
            icon={<AlertTriangle size={20} />}
            label="Qarzdor mijozlar"
            value={stats.debtors}
            variant="danger"
            active={stats.debtors > 0}
          />
        </section>

        <Card padding="md" className="customers-page__table">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Ism, kompaniya, telefon, email..."
            actionLabel="Yangi mijoz"
            actionIcon={<Plus size={17} />}
            onAction={() => navigate("/customers/create")}
          />

          <div className="customers-page__filters">
            <Select
              value={statusFilter}
              placeholder="Barcha statuslar"
              options={[
                { value: "", label: "Barcha statuslar" },
                { value: "ACTIVE", label: "Faol" },
                { value: "INACTIVE", label: "Faol emas" },
              ]}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <Select
              value={typeFilter}
              placeholder="Barcha turlar"
              options={[
                { value: "", label: "Barcha turlar" },
                { value: "INDIVIDUAL", label: "Jismoniy shaxs" },
                { value: "COMPANY", label: "Kompaniya" },
              ]}
              onChange={(event) => setTypeFilter(event.target.value)}
            />
            <Select
              value={agentFilter}
              placeholder="Barcha agentlar"
              options={[
                { value: "", label: "Barcha agentlar" },
                ...agents.map((agent) => ({
                  value: agent.id,
                  label: agent.name || agent.phone || agent.id,
                })),
              ]}
              onChange={(event) => setAgentFilter(event.target.value)}
            />
            <Select
              value={segmentFilter}
              placeholder="Barcha segmentlar"
              options={[
                { value: "", label: "Barcha segmentlar" },
                { value: "VIP", label: "VIP" },
                { value: "REGULAR", label: "REGULAR" },
                { value: "NEW", label: "NEW" },
                { value: "RISK", label: "RISK" },
                { value: "INACTIVE", label: "INACTIVE" },
              ]}
              onChange={(event) => setSegmentFilter(event.target.value)}
            />
            <Select
              value={debtFilter}
              placeholder="Qarz holati"
              options={[
                { value: "", label: "Qarz holati" },
                { value: "WITH_DEBT", label: "Qarzdor" },
                { value: "NO_DEBT", label: "Qarzsiz" },
                { value: "OVER_LIMIT", label: "Limitdan oshgan" },
              ]}
              onChange={(event) => setDebtFilter(event.target.value)}
            />
            <Select
              value={regionFilter}
              placeholder="Barcha regionlar"
              options={[
                { value: "", label: "Barcha regionlar" },
                ...regions.map((region) => ({ value: region, label: region })),
              ]}
              onChange={(event) => setRegionFilter(event.target.value)}
            />
          </div>

          <Table
            columns={[
              {
                key: "displayName",
                title: "Mijoz",
                render: (value, row) => (
                  <button
                    type="button"
                    className="customers-page__customer-link"
                    onClick={() => navigate(`/customers/${row.id}`)}
                  >
                    <strong>{value}</strong>
                    <span>{row.companyName && row.companyName !== value ? row.companyName : row.email || "-"}</span>
                  </button>
                ),
              },
              { key: "phone", title: "Telefon", render: (value) => value || "-" },
              { key: "agentName", title: "Agent" },
              {
                key: "salesAmount",
                title: "Savdo",
                render: (value) => `${formatSaleMoney(value)} so'm`,
              },
              {
                key: "debtAmount",
                title: "Qarz",
                render: (value, row) => (
                  <span className={row.credit.exceeded ? "customers-page__danger" : ""}>
                    {value > 0 && (
                      <LiveIcon
                        icon={AlertTriangle}
                        motion={row.credit.exceeded ? "danger-breathe" : "warning-glow"}
                        size={13}
                      />
                    )}
                    {formatSaleMoney(value)} so'm
                  </span>
                ),
              },
              {
                key: "lastSale",
                title: "Oxirgi savdo",
                render: (value) => (value ? formatSaleDate(value.completedAt || value.orderDate || value.createdAt) : "-"),
              },
              {
                key: "segment",
                title: "Segment",
                render: (value, row) => <Badge variant={row.score.variant}>{value}</Badge>,
              },
              {
                key: "status",
                title: "Status",
                render: (value) => (
                  <Badge variant={value === "ACTIVE" ? "success" : "neutral"}>{value}</Badge>
                ),
              },
              {
                key: "actions",
                title: "Actions",
                render: (_, row) => (
                  <div className="customers-page__actions">
                    <button type="button" title="Ko'rish" onClick={() => navigate(`/customers/${row.id}`)}>
                      <Eye size={15} />
                    </button>
                    <button type="button" title="Tahrirlash" onClick={() => navigate(`/customers/${row.id}/edit`)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" title="Yangi savdo" onClick={() => navigate(`/sales/terminal?customerId=${row.id}`)}>
                      <ReceiptText size={15} />
                    </button>
                    <button type="button" title="To'lov qabul qilish" onClick={() => navigate(`/customers/${row.id}?pay=1`)}>
                      <HandCoins size={15} />
                    </button>
                    <button
                      type="button"
                      title="Action menu"
                      onClick={() => setActionMenuId((current) => (current === row.id ? "" : row.id))}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {actionMenuId === row.id && (
                      <div className="customers-page__menu">
                        <button type="button" onClick={() => navigate(`/customers/${row.id}`)}>Ko'rish</button>
                        <button type="button" onClick={() => navigate(`/customers/${row.id}/edit`)}>Tahrirlash</button>
                        <button type="button" onClick={() => navigate(`/sales/terminal?customerId=${row.id}`)}>Yangi savdo</button>
                        <button type="button" onClick={() => navigate(`/customers/${row.id}?pay=1`)}>To'lov qabul qilish</button>
                        <button type="button" onClick={() => navigate(`/customers/${row.id}?follow=1`)}>Follow-up</button>
                        <button type="button" onClick={() => handleStatusToggle(row)}>
                          {row.status === "ACTIVE" ? "Faol emas qilish" : "Faol qilish"}
                        </button>
                        <button type="button" onClick={() => handleDelete(row)}>
                          {getCustomerDeleteSafety(row.id).canDelete ? "Delete" : "Deactivate"}
                        </button>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
            data={pagedRows}
            rowKey="id"
            emptyText="Mijozlar mavjud emas."
          />

          <div className="customers-page__pagination">
            <Badge variant="neutral">{filteredRows.length} ta natija</Badge>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </Card>

        {topCustomers.length > 0 && (
          <Card padding="md" className="customers-page__top">
            <h3>Top 5 mijozlar</h3>
            <div>
              {topCustomers.map((customer) => (
                <button key={customer.id} type="button" onClick={() => navigate(`/customers/${customer.id}`)}>
                  <span>{customer.displayName}</span>
                  <strong>{formatSaleMoney(customer.salesAmount)} so'm</strong>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

const Metric = ({ icon, label, value, variant = "", active = false }) => (
  <Card variant="soft" padding="md" className="customers-page__metric">
    <div
      className={[
        "customers-page__metric-icon",
        variant ? `customers-page__metric-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {active && icon.type ? (
        <LiveIcon icon={icon.type} motion={variant === "danger" ? "danger-breathe" : "warning-glow"} size={20} />
      ) : (
        icon
      )}
    </div>
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </Card>
);

export default CustomersPage;
