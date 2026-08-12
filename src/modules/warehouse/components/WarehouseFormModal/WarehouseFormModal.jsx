import { useEffect, useState } from "react";

import { Button, Input, Modal, Switch, Textarea } from "../../../../shared/ui";

const WarehouseFormModal = ({ open, warehouse, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    branch: "",
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
        branch: warehouse.branch || "",
        address: warehouse.address || "",
        responsible: warehouse.responsible || "",
        note: warehouse.note || "",
        status: warehouse.status !== "INACTIVE",
      });
    } else {
      setForm({
        name: "",
        branch: "",
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
      nextErrors.name = "Ombor nomini kiriting.";
    }

    if (!form.branch.trim()) {
      nextErrors.branch = "Filial nomini kiriting.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    onSubmit?.({
      id: warehouse?.id,
      name: form.name.trim(),
      branch: form.branch.trim(),
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
      title={warehouse ? "Omborni tahrirlash" : "Yangi ombor"}
      description={warehouse ? warehouse.name : "Yangi ombor yaratish."}
      size="md"
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <Input
          label="Ombor nomi"
          placeholder="Masalan: Asosiy ombor"
          value={form.name}
          error={errors.name}
          onChange={(event) => handleChange("name", event.target.value)}
        />

        <Input
          label="Filial"
          placeholder="Masalan: Asosiy filial"
          value={form.branch}
          error={errors.branch}
          onChange={(event) => handleChange("branch", event.target.value)}
        />

        <Input
          label="Manzil"
          placeholder="Ombor manzili"
          value={form.address}
          onChange={(event) => handleChange("address", event.target.value)}
        />

        <Input
          label="Mas’ul shaxs"
          placeholder="Masalan: Omborchi"
          value={form.responsible}
          onChange={(event) => handleChange("responsible", event.target.value)}
        />

        <Textarea
          label="Izoh"
          placeholder="Qo‘shimcha ma’lumot..."
          value={form.note}
          onChange={(event) => handleChange("note", event.target.value)}
        />

        <Switch
          checked={form.status}
          label="Ombor faol"
          description="Faol ombor operatsiyalarda ishlatilishi mumkin."
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
            Bekor qilish
          </Button>

          <Button onClick={handleSubmit}>
            {warehouse ? "Saqlash" : "Ombor yaratish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WarehouseFormModal;
