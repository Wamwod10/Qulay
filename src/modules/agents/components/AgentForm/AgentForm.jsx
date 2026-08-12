import { useState } from "react";

import { Button, Card, Input, Switch, Textarea } from "../../../../shared/ui";

import "./AgentForm.scss";

const toNumber = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number) ? number : 0;
};

const AgentForm = ({ initialValues, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    name: initialValues?.name || "",
    phone: initialValues?.phone || "",
    email: initialValues?.email || "",
    region: initialValues?.region || "",
    route: initialValues?.route || "",
    targetAmount: initialValues?.targetAmount || "",
    commissionPercent: initialValues?.commissionPercent || "",
    cashBalance: initialValues?.cashBalance || "",
    note: initialValues?.note || "",
    status: initialValues ? initialValues.status === "ACTIVE" : true,
  });

  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
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

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Agent nomini kiriting.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Telefon raqamini kiriting.";
    }

    if (!form.region.trim()) {
      nextErrors.region = "Hududni kiriting.";
    }

    if (toNumber(form.targetAmount) < 0) {
      nextErrors.targetAmount = "Reja manfiy bo'lishi mumkin emas.";
    }

    if (toNumber(form.commissionPercent) < 0) {
      nextErrors.commissionPercent = "Komissiyani tekshiring.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    onSubmit?.({
      id: initialValues?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      region: form.region.trim(),
      route: form.route.trim(),
      targetAmount: toNumber(form.targetAmount),
      commissionPercent: toNumber(form.commissionPercent),
      cashBalance: toNumber(form.cashBalance),
      note: form.note.trim(),
      status: form.status ? "ACTIVE" : "INACTIVE",
    });
  };

  return (
    <form className="agent-form" onSubmit={handleSubmit}>
      <Card padding="lg">
        <div className="agent-form__header">
          <h3>Agent ma'lumotlari</h3>
          <p>Savdo agentining asosiy ma'lumotlari.</p>
        </div>

        <div className="agent-form__grid">
          <Input
            label="Agent F.I.Sh."
            value={form.name}
            error={errors.name}
            placeholder="Masalan: Javohir Karimov"
            onChange={(event) => setField("name", event.target.value)}
          />

          <Input
            label="Telefon"
            value={form.phone}
            error={errors.phone}
            placeholder="+998 90 123 45 67"
            onChange={(event) => setField("phone", event.target.value)}
          />

          <Input
            label="Email"
            value={form.email}
            placeholder="agent@example.com"
            onChange={(event) => setField("email", event.target.value)}
          />

          <Input
            label="Hudud"
            value={form.region}
            error={errors.region}
            placeholder="Masalan: Yunusobod"
            onChange={(event) => setField("region", event.target.value)}
          />

          <Input
            label="Marshrut"
            value={form.route}
            placeholder="Yunusobod - Chilonzor"
            onChange={(event) => setField("route", event.target.value)}
          />

          <Input
            label="Oylik savdo rejasi"
            type="number"
            min="0"
            value={form.targetAmount}
            error={errors.targetAmount}
            onChange={(event) => setField("targetAmount", event.target.value)}
          />

          <Input
            label="Komissiya %"
            type="number"
            min="0"
            step="0.1"
            value={form.commissionPercent}
            error={errors.commissionPercent}
            onChange={(event) => setField("commissionPercent", event.target.value)}
          />

          <Input
            label="Agentdagi naqd pul (manual)"
            type="number"
            min="0"
            value={form.cashBalance}
            hint="Finance ulanganda bu qiymat derived balancega almashtiriladi."
            onChange={(event) => setField("cashBalance", event.target.value)}
          />
        </div>
      </Card>

      <Card padding="lg">
        <Switch
          checked={form.status}
          label="Agent faol"
          description="Faol agent savdo va buyurtmalarda tanlanishi mumkin."
          onChange={(event) => setField("status", event.target.checked)}
        />

        <div className="agent-form__note">
          <Textarea
            label="Izoh"
            value={form.note}
            placeholder="Agent haqida qo'shimcha ma'lumot..."
            onChange={(event) => setField("note", event.target.value)}
          />
        </div>
      </Card>

      <div className="agent-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Bekor qilish
        </Button>

        <Button type="submit">
          {initialValues ? "Saqlash" : "Agent yaratish"}
        </Button>
      </div>
    </form>
  );
};

export default AgentForm;
