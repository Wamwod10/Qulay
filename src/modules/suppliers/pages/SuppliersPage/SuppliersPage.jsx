import { useMemo, useState } from "react";
import { ConfirmDialog } from "../../../../shared/ui";

import {
  Building2,
  CircleDollarSign,
  PackageCheck,
  Plus,
  Truck,
} from "lucide-react";
import { getStoredProducts } from "../../../products/utils/productsStorage";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Card, LiveIcon, Select, TableToolbar } from "../../../../shared/ui";

import SupplierTable from "../../components/SupplierTable/SupplierTable";

import { getStoredPurchases } from "../../../purchases/utils/purchasesStorage";

import {
  formatSupplierMoney,
  getSupplierDebt,
} from "../../utils/supplierHelpers";

import {
  deleteSupplier,
  getStoredSuppliers,
  toggleSupplierStatus,
} from "../../utils/suppliersStorage";

import "./SuppliersPage.scss";

const SuppliersPage = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState(() => getStoredSuppliers());

  const [debtFilter, setDebtFilter] = useState("");

  const [deleteSupplierItem, setDeleteSupplierItem] = useState(null);

  const [purchases] = useState(() => getStoredPurchases());

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");

  const refreshSuppliers = () => {
    setSuppliers(getStoredSuppliers());
  };

  const handleToggleStatus = async (supplier) => {
    await toggleSupplierStatus(supplier.id);

    refreshSuppliers();
  };

  const handleDelete = async () => {
    if (!deleteSupplierItem) {
      return;
    }

    const hasPurchases = purchases.some(
      (purchase) => purchase.supplierId === deleteSupplierItem.id,
    );

    if (hasPurchases) {
      alert(
        "Bu yetkazib beruvchida xaridlar tarixi mavjud. Uni o‘chirish o‘rniga faol emas holatiga o‘tkazing.",
      );

      setDeleteSupplierItem(null);

      return;
    }

    const products = getStoredProducts();

    const hasProducts = products.some(
      (product) => product.supplierId === deleteSupplierItem.id,
    );

    if (hasPurchases || hasProducts) {
      alert(
        "Bu yetkazib beruvchi mahsulot yoki xaridlar bilan bog‘langan. O‘chirish o‘rniga faol emas holatiga o‘tkazing.",
      );

      setDeleteSupplierItem(null);

      return;
    }

    await deleteSupplier(deleteSupplierItem.id);

    setDeleteSupplierItem(null);

    refreshSuppliers();
  };

  const handleNewPurchase = (supplier) => {
    navigate(`/purchases/create?supplierId=${supplier.id}`);
  };

  const categoryOptions = useMemo(() => {
    const categories = new Set(
      suppliers.map((supplier) => supplier.category).filter(Boolean),
    );

    return Array.from(categories).map((category) => ({
      value: category,
      label: category,
    }));
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const debt = getSupplierDebt(supplier.id, purchases);

      const searchable = [
        supplier.name,
        supplier.companyName,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);

      const matchesStatus = !statusFilter || supplier.status === statusFilter;

      const matchesCategory =
        !categoryFilter || supplier.category === categoryFilter;

      const matchesDebt =
        !debtFilter ||
        (debtFilter === "WITH_DEBT" && debt > 0) ||
        (debtFilter === "NO_DEBT" && debt <= 0);

      return matchesSearch && matchesStatus && matchesCategory && matchesDebt;
    });
  }, [suppliers, purchases, search, statusFilter, categoryFilter, debtFilter]);

  const stats = useMemo(() => {
    const active = suppliers.filter(
      (supplier) => supplier.status === "ACTIVE",
    ).length;

    const totalDebt = purchases.reduce(
      (total, purchase) => total + Number(purchase.debtAmount || 0),
      0,
    );

    const totalPurchases = purchases.reduce(
      (total, purchase) => total + Number(purchase.total || 0),
      0,
    );

    return {
      total: suppliers.length,

      active,

      totalDebt,

      totalPurchases,
    };
  }, [suppliers, purchases]);

  return (
    <PageContainer
      title="Yetkazib beruvchilar"
      description="Yetkazib beruvchilar, xaridlar va qarzdorlikni boshqarish."
    >
      <div className="suppliers-page">
        <section className="suppliers-page__stats">
          <SupplierStat
            icon={<Truck size={21} />}
            label="Jami yetkazib beruvchi"
            value={stats.total}
          />

          <SupplierStat
            icon={<Building2 size={21} />}
            label="Faol"
            value={stats.active}
            variant="success"
          />

          <SupplierStat
            icon={
              <LiveIcon
                icon={CircleDollarSign}
                motion="pulse-soft"
                active={stats.totalDebt > 0}
                size={21}
              />
            }
            label="Jami qarz"
            value={formatSupplierMoney(stats.totalDebt)}
            variant="warning"
          />

          <SupplierStat
            icon={<PackageCheck size={21} />}
            label="Jami xarid"
            value={formatSupplierMoney(stats.totalPurchases)}
          />
        </section>

        <Card padding="md" className="suppliers-page__workspace">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Nomi, kontakt yoki telefon..."
            actionLabel="Yangi yetkazib beruvchi"
            actionIcon={<Plus size={17} />}
            onAction={() => navigate("/suppliers/create")}
          />

          <div className="suppliers-page__filters">
            <div className="suppliers-page__filter">
              <Select
                value={categoryFilter}
                placeholder="Barcha kategoriyalar"
                options={categoryOptions}
                onChange={(event) => setCategoryFilter(event.target.value)}
              />
            </div>

            <div className="suppliers-page__filter">
              <Select
                value={debtFilter}
                placeholder="Barcha qarzdorlik"
                options={[
                  {
                    value: "WITH_DEBT",
                    label: "Qarzi bor",
                  },
                  {
                    value: "NO_DEBT",
                    label: "Qarzi yo‘q",
                  },
                ]}
                onChange={(event) => setDebtFilter(event.target.value)}
              />
            </div>

            <div className="suppliers-page__filter">
              <Select
                value={statusFilter}
                placeholder="Barcha holatlar"
                options={[
                  {
                    value: "ACTIVE",
                    label: "Faol",
                  },
                  {
                    value: "INACTIVE",
                    label: "Faol emas",
                  },
                ]}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
            </div>
          </div>

          <div className="suppliers-page__result">
            {filteredSuppliers.length} ta yetkazib beruvchi
          </div>

          <SupplierTable
            suppliers={filteredSuppliers}
            purchases={purchases}
            onView={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            onEdit={(supplier) => navigate(`/suppliers/${supplier.id}/edit`)}
            onNewPurchase={handleNewPurchase}
            onPayment={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            onToggleStatus={handleToggleStatus}
            onDelete={(supplier) => setDeleteSupplierItem(supplier)}
          />
        </Card>
        <ConfirmDialog
          open={Boolean(deleteSupplierItem)}
          title="Yetkazib beruvchini o‘chirish"
          description={
            deleteSupplierItem
              ? `"${deleteSupplierItem.name}" yetkazib beruvchisi o‘chiriladi.`
              : ""
          }
          confirmText="O‘chirish"
          danger
          onClose={() => setDeleteSupplierItem(null)}
          onConfirm={handleDelete}
        />
      </div>
    </PageContainer>
  );
};

const SupplierStat = ({ icon, label, value, variant }) => (
  <Card variant="soft" padding="md" className="suppliers-page__stat">
    <div
      className={[
        "suppliers-page__stat-icon",

        variant ? `suppliers-page__stat-icon--${variant}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </div>

    <div>
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  </Card>
);

export default SuppliersPage;
