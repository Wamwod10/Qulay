import { useEffect, useMemo, useState } from "react";

import {
  Boxes,
  ChartNoAxesCombined,
  Factory,
  LoaderCircle,
  PackageCheck,
  Plus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Button, Card, EmptyState, LiveIcon, Select, Skeleton } from "../../../../shared/ui";

import BomCard from "../../components/BomCard/BomCard";
import ProductionOrdersTable from "../../components/ProductionOrderTable/ProductionOrderTable";

import {
  getStoredBoms,
  getStoredProductionOrders,
  fetchStoredBoms,
  fetchStoredProductionOrders,
} from "../../utils/manufacturingStorage";

import "./ManufacturingPage.scss";

const ManufacturingPage = () => {
  const navigate = useNavigate();

  const [boms, setBoms] = useState(() =>
    getStoredBoms().filter((bom) => bom.status === "ACTIVE"),
  );

  const [orders, setOrders] = useState(() => getStoredProductionOrders());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const refreshManufacturing = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [remoteBoms, remoteOrders] = await Promise.all([
        fetchStoredBoms(),
        fetchStoredProductionOrders(),
      ]);
      setBoms(remoteBoms.filter((bom) => bom.status === "ACTIVE"));
      setOrders(remoteOrders);
    } catch (error) {
      setLoadError(error?.message || "Ishlab chiqarish ma'lumotlarini yuklab bo'lmadi.");
      setBoms(getStoredBoms().filter((bom) => bom.status === "ACTIVE"));
      setOrders(getStoredProductionOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshManufacturing();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) => !statusFilter || order.status === statusFilter,
    );
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    const planned = orders.filter((order) => order.status === "PLANNED").length;

    const active = orders.filter(
      (order) => order.status === "IN_PROGRESS",
    ).length;

    const completed = orders.filter(
      (order) => order.status === "COMPLETED",
    ).length;

    return {
      total: orders.length,

      planned,
      active,
      completed,
    };
  }, [orders]);

  return (
    <PageContainer
      title="Ishlab chiqarish"
      description="Retseptlar, ishlab chiqarish buyurtmalari va ishlab chiqarish jarayonlarini boshqarish."
    >
      <div className="manufacturing-page">
        <div className="manufacturing-page__actions">
          <Button
            variant="secondary"
            leftIcon={<ChartNoAxesCombined size={17} />}
            onClick={() => navigate("/reports")}
          >
            Hisobotlar
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/manufacturing/boms/create")}
          >
            Yangi retsept
          </Button>

          <Button
            leftIcon={<Plus size={17} />}
            onClick={() => navigate("/manufacturing/orders/create")}
          >
            Yangi ishlab chiqarish
          </Button>
        </div>

        <section className="manufacturing-page__stats">
          {loading ? Array.from({ length: 4 }, (_, index) => (
            <Card key={index} variant="soft" padding="md" className="manufacturing-page__stat">
              <Skeleton width={42} height={42} radius={12} />
              <div>
                <Skeleton width={90} height={10} />
                <Skeleton width={46} height={22} />
              </div>
            </Card>
          )) : <>
          <ManufacturingStat
            icon={<Factory size={21} />}
            label="Jami buyurtma"
            value={stats.total}
          />

          <ManufacturingStat
            icon={<LiveIcon icon={Boxes} motion="pulse-soft" active={stats.planned > 0} size={21} />}
            label="Rejalashtirilgan"
            value={stats.planned}
          />

          <ManufacturingStat
            icon={<LiveIcon icon={LoaderCircle} motion="spin-slow" active={stats.active > 0} size={21} />}
            label="Jarayonda"
            value={stats.active}
            variant="warning"
          />

          <ManufacturingStat
            icon={<LiveIcon icon={PackageCheck} motion="success-pop" active={stats.completed > 0} size={21} />}
            label="Tugallangan"
            value={stats.completed}
            variant="success"
          />
          </>}
        </section>
        {loadError && (
          <EmptyState
            title="Ma'lumotlarni yuklab bo'lmadi"
            description={loadError}
            actionLabel="Qayta urinish"
            onAction={refreshManufacturing}
          />
        )}

        <Card padding="md">
          <div className="manufacturing-page__section-header">
            <div>
              <h3>Retseptlar</h3>

              <p>Tayyor mahsulot ishlab chiqarish uchun xomashyo tarkibi.</p>
            </div>
          </div>

          <div className="manufacturing-page__bom-grid">
            {loading ? Array.from({ length: 3 }, (_, index) => (
              <Card key={index} padding="md">
                <Skeleton width="65%" height={16} />
                <Skeleton width="42%" height={12} />
                <Skeleton width="100%" height={58} radius={12} />
              </Card>
            )) : boms.length ? boms.map((bom) => (
              <BomCard
                key={bom.id}
                bom={bom}
                onView={(item) => navigate(`/manufacturing/boms/${item.id}`)}
                onEdit={(item) =>
                  navigate(`/manufacturing/boms/${item.id}/edit`)
                }
              />
            )) : (
              <EmptyState title="Retsept mavjud emas" description="Hozircha faol retsept topilmadi." />
            )}
          </div>
        </Card>

        <Card padding="md">
          <div className="manufacturing-page__section-header manufacturing-page__section-header--orders">
            <div>
              <h3>Ishlab chiqarish buyurtmalari</h3>

              <p>Rejalashtirilgan va joriy ishlab chiqarish jarayonlari.</p>
            </div>

            <div className="manufacturing-page__filter">
              <Select
                value={statusFilter}
                placeholder="Barcha holatlar"
                options={[
                  {
                    value: "PLANNED",
                    label: "Rejalashtirilgan",
                  },
                  {
                    value: "IN_PROGRESS",
                    label: "Jarayonda",
                  },
                  {
                    value: "COMPLETED",
                    label: "Tugallangan",
                  },
                  {
                    value: "CANCELLED",
                    label: "Bekor qilingan",
                  },
                ]}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="manufacturing-page__loading-rows">
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height={46} radius={12} />)}
            </div>
          ) : (
          <ProductionOrdersTable
            orders={filteredOrders}
            onView={(order) => navigate(`/manufacturing/orders/${order.id}`)}
          />
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

const ManufacturingStat = ({ icon, label, value, variant }) => (
  <Card variant="soft" padding="md" className="manufacturing-page__stat">
    <div
      className={[
        "manufacturing-page__stat-icon",

        variant ? `manufacturing-page__stat-icon--${variant}` : "",
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

export default ManufacturingPage;
