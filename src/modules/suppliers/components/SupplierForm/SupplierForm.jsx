import { useState } from "react";

import {
  Button,
  Card,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../../../shared/ui";

import "./SupplierForm.scss";

const CATEGORY_OPTIONS = [
  {
    value: "Xomashyo",
    label: "Xomashyo",
  },
  {
    value: "Qadoqlash",
    label: "Qadoqlash",
  },
  {
    value: "Savdo mahsuloti",
    label: "Savdo mahsuloti",
  },
  {
    value: "Uskuna",
    label: "Uskuna",
  },
  {
    value: "Xizmat",
    label: "Xizmat",
  },
  {
    value: "Boshqa",
    label: "Boshqa",
  },
];

const SupplierForm = ({ initialValues, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    name: initialValues?.name || "",

    companyName: initialValues?.companyName || "",

    phone: initialValues?.phone || "",

    email: initialValues?.email || "",

    address: initialValues?.address || "",

    contactPerson: initialValues?.contactPerson || "",

    category: initialValues?.category || "",

    note: initialValues?.note || "",

    status: initialValues ? initialValues.status === "ACTIVE" : true,
  });

  const [errors, setErrors] = useState({});

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

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Yetkazib beruvchi nomini kiriting.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Telefon raqamini kiriting.";
    }

    if (!form.category) {
      nextErrors.category = "Kategoriya tanlang.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Email manzil noto‘g‘ri.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit?.({
      id: initialValues?.id,

      name: form.name.trim(),

      companyName: form.companyName.trim(),

      phone: form.phone.trim(),

      email: form.email.trim(),

      address: form.address.trim(),

      contactPerson: form.contactPerson.trim(),

      category: form.category,

      note: form.note.trim(),

      status: form.status ? "ACTIVE" : "INACTIVE",
    });
  };

  return (
    <form className="supplier-form" onSubmit={handleSubmit}>
      <Card padding="lg" className="supplier-form__section">
        <div className="supplier-form__section-header">
          <div>
            <h3>Asosiy ma’lumotlar</h3>

            <p>Yetkazib beruvchi haqidagi asosiy ma’lumotlar.</p>
          </div>
        </div>

        <div className="supplier-form__grid">
          <Input
            label="Yetkazib beruvchi nomi"
            value={form.name}
            placeholder="Masalan: Oltin Don Trade"
            error={errors.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />

          <Input
            label="Kompaniya nomi"
            value={form.companyName}
            placeholder="MChJ nomi"
            onChange={(event) =>
              handleChange("companyName", event.target.value)
            }
          />

          <Select
            label="Kategoriya"
            value={form.category}
            placeholder="Kategoriya tanlang"
            options={CATEGORY_OPTIONS}
            error={errors.category}
            onChange={(event) => handleChange("category", event.target.value)}
          />

          <Input
            label="Kontakt shaxs"
            value={form.contactPerson}
            placeholder="Masalan: Javlon Karimov"
            onChange={(event) =>
              handleChange("contactPerson", event.target.value)
            }
          />
        </div>
      </Card>

      <Card padding="lg" className="supplier-form__section">
        <div className="supplier-form__section-header">
          <div>
            <h3>Kontaktlar</h3>

            <p>Aloqa va manzil ma’lumotlari.</p>
          </div>
        </div>

        <div className="supplier-form__grid">
          <Input
            label="Telefon"
            value={form.phone}
            placeholder="+998 90 123 45 67"
            error={errors.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            placeholder="info@company.uz"
            error={errors.email}
            onChange={(event) => handleChange("email", event.target.value)}
          />

          <div className="supplier-form__full">
            <Input
              label="Manzil"
              value={form.address}
              placeholder="Toshkent shahri..."
              onChange={(event) => handleChange("address", event.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card padding="lg" className="supplier-form__section">
        <div className="supplier-form__section-header">
          <div>
            <h3>Qo‘shimcha</h3>

            <p>Holat va ichki izoh.</p>
          </div>
        </div>

        <div className="supplier-form__extra">
          <Switch
            checked={form.status}
            label="Yetkazib beruvchi faol"
            description="Faol yetkazib beruvchi xaridlarda tanlanishi mumkin."
            onChange={(event) => handleChange("status", event.target.checked)}
          />

          <Textarea
            label="Izoh"
            value={form.note}
            placeholder="Yetkazib beruvchi haqida qo‘shimcha ma’lumot..."
            onChange={(event) => handleChange("note", event.target.value)}
          />
        </div>
      </Card>

      <div className="supplier-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Bekor qilish
        </Button>

        <Button type="submit">
          {initialValues
            ? "O‘zgarishlarni saqlash"
            : "Yetkazib beruvchi yaratish"}
        </Button>
      </div>
    </form>
  );
};

export default SupplierForm;
