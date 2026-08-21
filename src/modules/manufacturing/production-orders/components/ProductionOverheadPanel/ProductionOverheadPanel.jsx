import { useEffect, useState } from "react";

import { Pencil, Plus, Trash2, WalletCards } from "lucide-react";

import {
  Button,
  Card,
  Input,
  LiveIcon,
  Modal,
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

const emptyDraft = () => ({
  ...createOverheadItem(),
  type: OVERHEAD_TYPES[0]?.value || "LABOR",
  name: "",
  amount: "",
  note: "",
});

const ProductionOverheadPanel = ({ order, readOnly = false, onChange }) => {
  const items = normalizeOverheadItems(order?.overheadItems);
  const total = calculateOverheadCost(items);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (readOnly) {
      setDraft(null);
      setFormError("");
    }
  }, [readOnly]);

  const emitChange = async (nextItems) => {
    if (readOnly) return;
    await onChange?.(normalizeOverheadItems(nextItems));
  };

  const openCreate = () => {
    setDraft(emptyDraft());
    setFormError("");
  };

  const openEdit = (item) => {
    setDraft({
      ...item,
      amount: String(item.amount || ""),
    });
    setFormError("");
  };

  const closeModal = () => {
    if (saving) return;
    setDraft(null);
    setFormError("");
  };

  const updateDraft = (field, value) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            [field]: field === "amount" ? value : value,
          }
        : current
    ));
    setFormError("");
  };

  const handleSave = async () => {
    if (!draft) return;

    const name = String(draft.name || "").trim();
    const amount = positiveNumber(draft.amount);

    if (!name) {
      setFormError("Xarajat nomini kiriting.");
      return;
    }

    if (amount <= 0) {
      setFormError("Summa 0 dan katta bo'lishi kerak.");
      return;
    }

    const nextItem = {
      ...draft,
      name,
      amount,
      note: String(draft.note || "").trim(),
    };

    const exists = items.some((item) => item.id === draft.id);
    const nextItems = exists
      ? items.map((item) => (item.id === draft.id ? nextItem : item))
      : [nextItem, ...items];

    setSaving(true);

    try {
      await emitChange(nextItems);
      setDraft(null);
      setFormError("");
    } catch (error) {
      setFormError(error?.message || "Xarajatni saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    setSaving(true);

    try {
      await emitChange(items.filter((item) => item.id !== itemId));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg" className="production-overhead">
      <div className="production-overhead__header">
        <div>
          <h3>Qo'shimcha ishlab chiqarish xarajatlari</h3>
          <p>Materialdan tashqari ishlab chiqarish xarajatlari.</p>
        </div>

        <div className="production-overhead__summary">
          <LiveIcon icon={WalletCards} motion="pulse-soft" size={17} />
          <span>Jami qo'shimcha xarajat</span>
          <strong>{formatManufacturingMoney(total)}</strong>
        </div>
      </div>

      <div className="production-overhead__list">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="production-overhead__item">
              <div>
                <span>Kategoriya</span>
                <strong>{OVERHEAD_TYPES.find((type) => type.value === item.type)?.label || item.type}</strong>
              </div>

              <div>
                <span>Nomi</span>
                <strong>{item.name}</strong>
                {item.note && <small>{item.note}</small>}
              </div>

              <div className="production-overhead__amount">
                <span>Summa</span>
                <strong>{formatManufacturingMoney(item.amount)}</strong>
              </div>

              {!readOnly && (
                <div className="production-overhead__row-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Xarajatni tahrirlash"
                    disabled={saving}
                    onClick={() => openEdit(item)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Xarajatni o'chirish"
                    disabled={saving}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="production-overhead__empty">
            Qo'shimcha xarajatlar kiritilmagan.
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="production-overhead__actions">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Plus size={16} />}
            disabled={saving}
            onClick={openCreate}
          >
            Xarajat qo'shish
          </Button>
        </div>
      )}

      <Modal
        open={Boolean(draft)}
        title={draft && items.some((item) => item.id === draft.id) ? "Xarajatni tahrirlash" : "Xarajat qo'shish"}
        description="Qo'shimcha xarajat real ishlab chiqarish tannarxiga qo'shiladi."
        size="sm"
        onClose={closeModal}
        footer={(
          <>
            <Button type="button" variant="secondary" disabled={saving} onClick={closeModal}>
              Bekor qilish
            </Button>
            <Button type="button" loading={saving} disabled={saving} onClick={handleSave}>
              Saqlash
            </Button>
          </>
        )}
      >
        {draft && (
          <div className="production-overhead__modal-form">
            <Input
              label="Xarajat nomi"
              value={draft.name}
              placeholder="Masalan: smena ishchi haqi"
              error={formError && !String(draft.name || "").trim() ? formError : ""}
              onChange={(event) => updateDraft("name", event.target.value)}
            />

            <Select
              label="Kategoriya"
              value={draft.type}
              options={OVERHEAD_TYPES}
              onChange={(event) => updateDraft("type", event.target.value)}
            />

            <Input
              label="Summa"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={draft.amount}
              error={formError && positiveNumber(draft.amount) <= 0 ? formError : ""}
              onChange={(event) => updateDraft("amount", event.target.value)}
            />

            <Textarea
              label="Izoh"
              value={draft.note}
              placeholder="Qo'shimcha izoh..."
              onChange={(event) => updateDraft("note", event.target.value)}
            />

            {formError && <div className="production-overhead__error">{formError}</div>}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ProductionOverheadPanel;
