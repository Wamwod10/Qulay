import { Pencil, Plus, Power, Warehouse } from "lucide-react";

import { Badge, Button, Card, EmptyState } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";

import "./WarehouseManager.scss";

const WarehouseManager = ({
  warehouses = [],
  onCreate,
  onEdit,
  onToggleStatus,
}) => {
  return (
    <Card padding="md" className="warehouse-manager">
      <div className="warehouse-manager__header">
        <div>
          <h3>{translateText("Omborlar")}</h3>

          <p>{translateText("Kompaniyadagi omborlarni boshqarish.")}</p>
        </div>

        <Button size="sm" leftIcon={<Plus size={16} />} onClick={onCreate}>
          {translateText("Yangi ombor")}
        </Button>
      </div>

      {!warehouses.length ? (
        <EmptyState
          icon={Warehouse}
          title={translateText("Ombor mavjud emas")}
          description={translateText("Birinchi omborni yaratib ishni boshlang.")}
          actionLabel={translateText("Ombor yaratish")}
          onAction={onCreate}
        />
      ) : (
        <div className="warehouse-manager__grid">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="warehouse-manager__item">
              <div className="warehouse-manager__icon">
                <Warehouse size={20} />
              </div>

              <div className="warehouse-manager__content">
                <div className="warehouse-manager__title">
                  <strong>{warehouse.name}</strong>

                  <Badge
                    size="sm"
                    variant={
                      warehouse.status === "ACTIVE" ? "success" : "neutral"
                    }
                  >
                    {translateText(
                      warehouse.status === "ACTIVE" ? "Faol" : "Faol emas",
                    )}
                  </Badge>
                </div>

                <span>{warehouse.code || warehouse.address || translateText("Kod kiritilmagan")}</span>

                {warehouse.address && (
                  <small>
                    {warehouse.address}
                  </small>
                )}
              </div>

              <div className="warehouse-manager__actions">
                <Button
                  size="sm"
                  variant="ghost"
                  title={translateText("Tahrirlash")}
                  onClick={() => onEdit?.(warehouse)}
                >
                  <Pencil size={15} />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  title={translateText("Holatni o‘zgartirish")}
                  onClick={() => onToggleStatus?.(warehouse)}
                >
                  <Power size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WarehouseManager;
