import { useMemo, useState } from "react";

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

import { Button, Card, LiveIcon, Select } from "../../../../shared/ui";

import BomCard from "../../components/BomCard/BomCard";
import ProductionOrdersTable from "../../components/ProductionOrderTable/ProductionOrderTable";

import {
  getStoredBoms,
  getStoredProductionOrders,
} from "../../utils/manufacturingStorage";

import "./ManufacturingPage.scss";

const ManufacturingPage = () => {
  const navigate = useNavigate();

  const [boms] = useState(() =>
    getStoredBoms().filter((bom) => bom.status === "ACTIVE"),
  );

  const [orders] = useState(() => getStoredProductionOrders());

  const [statusFilter, setStatusFilter] = useState("");

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
            Yangi BOM
          </Button>

          <Button
            leftIcon={<Plus size={17} />}
            onClick={() => navigate("/manufacturing/orders/create")}
          >
            Yangi ishlab chiqarish
          </Button>
        </div>

        <section className="manufacturing-page__stats">
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
        </section>

        <Card padding="md">
          <div className="manufacturing-page__section-header">
            <div>
              <h3>BOM / Retseptlar</h3>

              <p>Tayyor mahsulot ishlab chiqarish uchun xomashyo tarkibi.</p>
            </div>
          </div>

          <div className="manufacturing-page__bom-grid">
            {boms.map((bom) => (
              <BomCard
                key={bom.id}
                bom={bom}
                onView={(item) => navigate(`/manufacturing/boms/${item.id}`)}
                onEdit={(item) =>
                  navigate(`/manufacturing/boms/${item.id}/edit`)
                }
              />
            ))}
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

          <ProductionOrdersTable
            orders={filteredOrders}
            onView={(order) => navigate(`/manufacturing/orders/${order.id}`)}
          />
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
