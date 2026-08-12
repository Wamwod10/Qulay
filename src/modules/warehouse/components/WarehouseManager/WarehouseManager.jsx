import { Pencil, Plus, Power, Warehouse } from "lucide-react";

import { Badge, Button, Card, EmptyState } from "../../../../shared/ui";

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
          <h3>Omborlar</h3>

          <p>Kompaniyadagi omborlarni boshqarish.</p>
        </div>

        <Button size="sm" leftIcon={<Plus size={16} />} onClick={onCreate}>
          Yangi ombor
        </Button>
      </div>

      {!warehouses.length ? (
        <EmptyState
          icon={Warehouse}
          title="Ombor mavjud emas"
          description="Birinchi omborni yaratib ishni boshlang."
          actionLabel="Ombor yaratish"
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
                    {warehouse.status === "ACTIVE" ? "Faol" : "Faol emas"}
                  </Badge>
                </div>

                <span>{warehouse.branch || "Filial yo‘q"}</span>

                {warehouse.responsible && (
                  <small>Mas’ul: {warehouse.responsible}</small>
                )}
              </div>

              <div className="warehouse-manager__actions">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Tahrirlash"
                  onClick={() => onEdit?.(warehouse)}
                >
                  <Pencil size={15} />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  title="Statusni o‘zgartirish"
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
