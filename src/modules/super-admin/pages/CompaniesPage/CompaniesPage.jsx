import { useEffect, useMemo, useState } from "react";
import { Ban, Building2, CheckCircle2, Eye, RefreshCcw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge, Button, Card, EmptyState, Input, Select, Table } from "../../../../shared/ui";
import {
  getSuperAdminCompanies,
  updateSuperAdminCompanyStatus,
} from "../../services/superAdminApi";

const CompaniesPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setCompanies(await getSuperAdminCompanies());
      setError("");
    } catch (err) {
      setError(err.message || "Kompaniyalar yuklanmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((company) => {
      const text = [company.name, company.businessName, company.email, company.phone, company.owner?.fullName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!q || text.includes(q)) && (!status || company.status === status);
    });
  }, [companies, search, status]);

  const toggleStatus = async (company) => {
    const next = company.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    const updated = await updateSuperAdminCompanyStatus(company.id, next);
    setCompanies((current) => current.map((item) => (item.id === company.id ? updated : item)));
  };

  const columns = [
    {
      key: "company",
      title: "Kompaniya",
      render: (_, company) => (
        <button type="button" className="customers-page__customer-link" onClick={() => navigate(`/superadmin/companies/${company.id}`)}>
          <strong>{company.businessName || company.name}</strong>
          <span>{company.email || company.phone || company.id}</span>
        </button>
      ),
    },
    {
      key: "owner",
      title: "Owner",
      render: (_, company) => company.owner?.fullName || company.owner?.email || "-",
    },
    {
      key: "usersCount",
      title: "Users",
      render: (value) => value || 0,
    },
    {
      key: "status",
      title: "Holat",
      render: (value) => <Badge variant={value === "BLOCKED" ? "danger" : "success"}>{value}</Badge>,
    },
    {
      key: "createdAt",
      title: "Register",
      render: (value) => new Date(value).toLocaleString("uz-UZ"),
    },
    {
      key: "actions",
      title: "",
      render: (_, company) => (
        <div className="sa-users__actions">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/superadmin/companies/${company.id}`)}>
            <Eye size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggleStatus(company)}>
            {company.status === "BLOCKED" ? <CheckCircle2 size={16} /> : <Ban size={16} />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sa-users">
      <header className="sa-users__header">
        <div>
          <h1>Kompaniyalar</h1>
          <p>Tenantlar, ownerlar va bloklash holati real DBdan.</p>
        </div>
        <Button variant="secondary" leftIcon={<RefreshCcw size={16} />} onClick={load}>Yangilash</Button>
      </header>

      <section className="sa-users__stats">
        <Stat icon={<Building2 />} label="Jami" value={companies.length} />
        <Stat icon={<CheckCircle2 />} label="Faol" value={companies.filter((item) => item.status === "ACTIVE").length} />
        <Stat icon={<Ban />} label="Bloklangan" value={companies.filter((item) => item.status === "BLOCKED").length} />
      </section>

      <Card padding="md" className="sa-users__workspace">
        <div className="sa-users__toolbar">
          <div className="sa-users__search">
            <Input value={search} placeholder="Kompaniya, owner, email..." leftIcon={<Search size={16} />} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="sa-users__filter">
            <Select value={status} options={[{ value: "", label: "Barcha holatlar" }, { value: "ACTIVE", label: "Faol" }, { value: "BLOCKED", label: "Bloklangan" }]} onChange={(event) => setStatus(event.target.value)} />
          </div>
        </div>

        {error && <div className="sa-users__error">{error}</div>}
        {loading ? <div>Kompaniyalar yuklanmoqda...</div> : rows.length ? <Table columns={columns} data={rows} rowKey="id" /> : <EmptyState title="Kompaniya topilmadi" />}
      </Card>
    </div>
  );
};

const Stat = ({ icon, label, value }) => (
  <Card padding="md" className="sa-users__stat">
    <div className="sa-users__stat-icon">{icon}</div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

export default CompaniesPage;
