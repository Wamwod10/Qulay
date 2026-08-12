import { ArrowLeft, FlaskConical, Package, Pencil, Wallet } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import { Badge, Button, Card, Table } from "../../../../shared/ui";

import { getStoredBoms } from "../../utils/manufacturingStorage";

import {
  calculateBomMaterialCost,
  calculateBomUnitCost,
  formatManufacturingMoney,
} from "../../utils/manufacturingHelpers";

import "./BomDetailsPage.scss";

const BomDetailsPage = () => {
  const navigate = useNavigate();

  const { bomId } = useParams();

  const bom = getStoredBoms().find((item) => item.id === bomId);

  if (!bom) {
    return (
      <PageContainer title="BOM topilmadi">
        <Button variant="secondary" onClick={() => navigate("/manufacturing")}>
          Ortga
        </Button>
      </PageContainer>
    );
  }

  const totalCost = calculateBomMaterialCost(bom);

  const unitCost = calculateBomUnitCost(bom);

  const columns = [
    {
      key: "productName",
      title: "Xomashyo",

      render: (value, material) => (
        <div className="bom-details__material">
          <strong>{value}</strong>

          <span>SKU: {material.sku || "—"}</span>
        </div>
      ),
    },

    {
      key: "quantity",
      title: "Miqdor",

      render: (value, material) => `${value} ${material.unit}`,
    },

    {
      key: "cost",
      title: "Tannarx",

      render: (value) => `${formatManufacturingMoney(value)} so‘m`,
    },

    {
      key: "total",
      title: "Jami",

      render: (_, material) =>
        `${formatManufacturingMoney(
          Number(material.quantity || 0) * Number(material.cost || 0),
        )} so‘m`,
    },
  ];

  return (
    <PageContainer
      title={bom.name}
      description={`${bom.productName} · v${bom.version}`}
    >
      <div className="bom-details">
        <div className="bom-details__actions">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/manufacturing")}
          >
            Ortga
          </Button>

          <Button
            leftIcon={<Pencil size={17} />}
            onClick={() => navigate(`/manufacturing/boms/${bom.id}/edit`)}
          >
            Tahrirlash
          </Button>
        </div>

        <section className="bom-details__summary">
          <Card className="bom-details__identity">
            <div className="bom-details__identity-icon">
              <FlaskConical size={28} />
            </div>

            <div>
              <div className="bom-details__identity-title">
                <h2>{bom.productName}</h2>

                <Badge
                  variant={bom.status === "ACTIVE" ? "success" : "neutral"}
                >
                  {bom.status === "ACTIVE" ? "Faol" : "Faol emas"}
                </Badge>
              </div>

              <p>{bom.name}</p>

              <span>Versiya: {bom.version}</span>
            </div>
          </Card>

          <BomMetric
            icon={<Package size={20} />}
            label="Chiqish"
            value={`${bom.outputQuantity} ${bom.outputUnit}`}
          />

          <BomMetric
            icon={<Wallet size={20} />}
            label="Batch tannarxi"
            value={`${formatManufacturingMoney(totalCost)} so‘m`}
          />

          <BomMetric
            label="1 birlik tannarx"
            value={`${formatManufacturingMoney(unitCost)} so‘m`}
          />
        </section>

        <Card>
          <div className="bom-details__section-title">
            <h3>Xomashyolar</h3>

            <p>{bom.materials?.length || 0} ta material</p>
          </div>

          <Table
            columns={columns}
            data={bom.materials || []}
            rowKey="id"
            emptyText="Xomashyo mavjud emas."
          />
        </Card>

        {bom.note && (
          <Card>
            <div className="bom-details__section-title">
              <h3>Izoh</h3>
            </div>

            <div className="bom-details__note">{bom.note}</div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

const BomMetric = ({ icon, label, value }) => (
  <Card className="bom-details__metric">
    {icon && <div className="bom-details__metric-icon">{icon}</div>}

    <span>{label}</span>

    <strong>{value}</strong>
  </Card>
);

export default BomDetailsPage;
