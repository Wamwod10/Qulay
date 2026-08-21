import { useEffect, useState } from "react";

import { Button, Input, Modal, Switch, Textarea } from "../../../../shared/ui";
import { translateText } from "../../../../localization/i18n";

const WarehouseFormModal = ({ open, warehouse, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    responsible: "",
    note: "",
    status: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      return;
    }

    if (warehouse) {
      setForm({
        name: warehouse.name || "",
        code: warehouse.code || "",
        address: warehouse.address || "",
        responsible: warehouse.responsible || "",
        note: warehouse.note || "",
        status: warehouse.status !== "INACTIVE",
      });
    } else {
      setForm({
        name: "",
        code: "",
        address: "",
        responsible: "",
        note: "",
        status: true,
      });
    }

    setErrors({});
  }, [open, warehouse]);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = translateText("Ombor nomini kiriting.");
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    onSubmit?.({
      id: warehouse?.id,
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim(),
      responsible: form.responsible.trim(),
      note: form.note.trim(),
      status: form.status ? "ACTIVE" : "INACTIVE",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={translateText(warehouse ? "Omborni tahrirlash" : "Yangi ombor")}
      description={warehouse ? warehouse.name : translateText("Yangi ombor yaratish.")}
      size="md"
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <Input
          label={translateText("Ombor nomi")}
          placeholder={translateText("Masalan: Asosiy ombor")}
          value={form.name}
          error={errors.name}
          onChange={(event) => handleChange("name", event.target.value)}
        />

        <Input
          label={translateText("Ombor kodi")}
          placeholder={translateText("Masalan: MAIN")}
          value={form.code}
          error={errors.code}
          onChange={(event) => handleChange("code", event.target.value)}
        />

        <Input
          label={translateText("Manzil")}
          placeholder={translateText("Ombor manzili")}
          value={form.address}
          onChange={(event) => handleChange("address", event.target.value)}
        />

        <Input
          label={translateText("Mas’ul shaxs")}
          placeholder={translateText("Masalan: Omborchi")}
          value={form.responsible}
          onChange={(event) => handleChange("responsible", event.target.value)}
        />

        <Textarea
          label={translateText("Izoh")}
          placeholder={translateText("Qo‘shimcha ma’lumot...")}
          value={form.note}
          onChange={(event) => handleChange("note", event.target.value)}
        />

        <Switch
          checked={form.status}
          label={translateText("Ombor faol")}
          description={translateText("Faol ombor operatsiyalarda ishlatilishi mumkin.")}
          onChange={(event) => handleChange("status", event.target.checked)}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            {translateText("Bekor qilish")}
          </Button>

          <Button onClick={handleSubmit}>
            {translateText(warehouse ? "Saqlash" : "Ombor yaratish")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WarehouseFormModal;
