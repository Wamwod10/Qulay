import { FlaskConical, Pencil } from "lucide-react";

import { Badge, Button, Card } from "../../../../shared/ui";

import {
  calculateBomMaterialCost,
  calculateBomUnitCost,
  formatManufacturingMoney,
} from "../../utils/manufacturingHelpers";

import "./BomCard.scss";

const BomCard = ({ bom, onView, onEdit }) => {
  const totalCost = calculateBomMaterialCost(bom);

  const unitCost = calculateBomUnitCost(bom);

  return (
    <Card variant="soft" padding="md" className="bom-card">
      <div className="bom-card__top">
        <div className="bom-card__identity">
          <div className="bom-card__icon">
            <FlaskConical size={21} />
          </div>

          <div>
            <strong>{bom.name}</strong>

            <span>{bom.productName}</span>
          </div>
        </div>

        <Badge variant={bom.status === "ACTIVE" ? "success" : "neutral"}>
          {bom.status === "ACTIVE" ? "Faol" : "Faol emas"}
        </Badge>
      </div>

      <div className="bom-card__stats">
        <div>
          <span>Chiqish</span>

          <strong>
            {bom.outputQuantity} {bom.unit}
          </strong>
        </div>

        <div>
          <span>Xomashyo</span>

          <strong>{bom.materials?.length || 0} ta</strong>
        </div>

        <div>
          <span>Versiya</span>

          <strong>v{bom.version}</strong>
        </div>
      </div>

      <div className="bom-card__cost">
        <div>
          <span>Batch tannarxi</span>

          <strong>{formatManufacturingMoney(totalCost)}</strong>
        </div>

        <div>
          <span>1 birlik tannarx</span>

          <strong>{formatManufacturingMoney(unitCost)}</strong>
        </div>
      </div>

      <div className="bom-card__actions">
        <Button variant="secondary" size="sm" onClick={() => onView?.(bom)}>
          Ko‘rish
        </Button>

        <Button
          variant="ghost"
          size="sm"
          title="Tahrirlash"
          onClick={() => onEdit?.(bom)}
        >
          <Pencil size={15} />
        </Button>
      </div>
    </Card>
  );
};

export default BomCard;
