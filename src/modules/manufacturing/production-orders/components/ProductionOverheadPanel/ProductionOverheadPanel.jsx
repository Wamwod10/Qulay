import { Plus, Trash2, WalletCards } from "lucide-react";

import {
  Button,
  Card,
  Input,
  LiveIcon,
  Select,
  Textarea,
} from "../../../../../shared/ui";

import { formatManufacturingMoney } from "../../../utils/manufacturingHelpers";

import {
  calculateOverheadCost,
  createOverheadItem,
  normalizeOverheadItems,
  OVERHEAD_TYPES,
  positiveNumber,
} from "../../../utils/productionCost";

import "./ProductionOverheadPanel.scss";

const ProductionOverheadPanel = ({ order, readOnly = false, onChange }) => {
  const items = normalizeOverheadItems(order?.overheadItems);

  const total = calculateOverheadCost(items);

  const emitChange = (nextItems) => {
    if (readOnly) {
      return;
    }

    onChange?.(normalizeOverheadItems(nextItems));
  };

  const handleAdd = () => {
    emitChange([createOverheadItem(), ...items]);
  };

  const handleUpdate = (itemId, field, value) => {
    emitChange(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: field === "amount" ? positiveNumber(value) : value,
            }
          : item,
      ),
    );
  };

  const handleDelete = (itemId) => {
    emitChange(items.filter((item) => item.id !== itemId));
  };

  return (
    <Card padding="lg" className="production-overhead">
      <div className="production-overhead__header">
        <div>
          <h3>Ishlab chiqarish xarajatlari / Overhead</h3>
          <p>Materialdan tashqari ishlab chiqarish xarajatlari.</p>
        </div>

        <div className="production-overhead__summary">
          <LiveIcon icon={WalletCards} motion="pulse-soft" size={17} />
          <span>Jami overhead</span>
          <strong>{formatManufacturingMoney(total)}</strong>
        </div>
      </div>

      <div className="production-overhead__list">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="production-overhead__item">
              <Select
                label="Turi"
                value={item.type}
                options={OVERHEAD_TYPES}
                disabled={readOnly}
                onChange={(event) =>
                  handleUpdate(item.id, "type", event.target.value)
                }
              />

              <Input
                label="Nomi / izoh"
                value={item.name}
                disabled={readOnly}
                placeholder="Masalan: smena ishchi haqi"
                onChange={(event) =>
                  handleUpdate(item.id, "name", event.target.value)
                }
              />

              <Input
                label="Summa"
                type="number"
                min="0"
                step="any"
                value={item.amount}
                disabled={readOnly}
                onChange={(event) =>
                  handleUpdate(item.id, "amount", event.target.value)
                }
              />

              <Textarea
                label="Izoh"
                value={item.note}
                disabled={readOnly}
                placeholder="Qo'shimcha izoh..."
                onChange={(event) =>
                  handleUpdate(item.id, "note", event.target.value)
                }
              />

              {!readOnly && (
                <Button
                  variant="ghost"
                  className="production-overhead__delete"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="production-overhead__empty">
            Overhead xarajatlari kiritilmagan.
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="production-overhead__actions">
          <Button
            variant="secondary"
            leftIcon={<Plus size={16} />}
            onClick={handleAdd}
          >
            Xarajat qo'shish
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ProductionOverheadPanel;
