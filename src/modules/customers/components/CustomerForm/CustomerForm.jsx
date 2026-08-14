import { useMemo, useState } from "react";

import { AlertTriangle, Save, X } from "lucide-react";

import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { Badge, Button, Card, Input, LiveIcon, Select, Textarea } from "../../../../shared/ui";

import {
  CUSTOMER_SEGMENTS,
  CUSTOMER_SOURCES,
  getStoredCustomers,
  normalizeCustomer,
} from "../../utils/customersStorage";

import "./CustomerForm.scss";

const TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Jismoniy shaxs" },
  { value: "COMPANY", label: "Kompaniya" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Faol" },
  { value: "INACTIVE", label: "Faol emas" },
];

const SEGMENT_OPTIONS = CUSTOMER_SEGMENTS.map((segment) => ({
  value: segment,
  label: segment,
}));

const SOURCE_OPTIONS = CUSTOMER_SOURCES.map((source) => ({
  value: source,
  label: source,
}));

const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const CustomerForm = ({ initialCustomer, onSubmit, onCancel, submitLabel = "Saqlash" }) => {
  const normalizedInitial = normalizeCustomer(initialCustomer || {});
  const [values, setValues] = useState(normalizedInitial);
  const [errors, setErrors] = useState({});

  const agents = useMemo(() => getStoredAgents(), []);
  const activeAgents = agents.filter((agent) => agent.status === "ACTIVE");
  const selectedInactiveAgent = agents.find(
    (agent) => agent.id === values.agentId && agent.status !== "ACTIVE",
  );

  const agentOptions = [
    { value: "", label: "Agent tanlanmagan" },
    ...activeAgents.map((agent) => ({
      value: agent.id,
      label: agent.name || agent.phone || agent.id,
    })),
    ...(selectedInactiveAgent
      ? [
          {
            value: selectedInactiveAgent.id,
            label: `${selectedInactiveAgent.name || selectedInactiveAgent.id} (inactive)`,
          },
        ]
      : []),
  ];

  const duplicatePhone = useMemo(() => {
    const phone = values.phone.trim();

    if (!phone) {
      return null;
    }

    return (
      getStoredCustomers().find(
        (customer) => customer.id !== values.id && customer.phone.trim() === phone,
      ) || null
    );
  }, [values.id, values.phone]);

  const patchValue = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = "Ism yoki mijoz nomi majburiy.";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "Telefon majburiy.";
    } else if (duplicatePhone) {
      nextErrors.phone = "Bu telefon raqam bilan mijoz mavjud.";
    }

    if (!isValidEmail(values.email.trim())) {
      nextErrors.email = "Email formati noto'g'ri.";
    }

    if (Number(values.creditLimit || 0) < 0) {
      nextErrors.creditLimit = "Credit limit manfiy bo'lmasin.";
    }

    if (Number(values.paymentTermDays || 0) < 0) {
      nextErrors.paymentTermDays = "Payment term manfiy bo'lmasin.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(
      normalizeCustomer({
        ...values,
        tags: values.tags,
        creditLimit: Number(values.creditLimit || 0),
        paymentTermDays: Number(values.paymentTermDays || 0),
      }),
    );
  };

  return (
    <Card padding="lg" className="customer-form">
      <form onSubmit={handleSubmit}>
        <div className="customer-form__grid">
          <Select
            label="Customer type"
            value={values.type}
            options={TYPE_OPTIONS}
            onChange={(event) => patchValue("type", event.target.value)}
          />
          <Select
            label="Status"
            value={values.status}
            options={STATUS_OPTIONS}
            onChange={(event) => patchValue("status", event.target.value)}
          />
          <Input
            label={values.type === "COMPANY" ? "Mijoz nomi" : "To'liq ism"}
            value={values.name}
            required
            error={errors.name}
            onChange={(event) => patchValue("name", event.target.value)}
          />
          {values.type === "COMPANY" && (
            <>
              <Input
                label="Company name"
                value={values.companyName}
                onChange={(event) => patchValue("companyName", event.target.value)}
              />
              <Input
                label="Contact person"
                value={values.contactPerson}
                onChange={(event) => patchValue("contactPerson", event.target.value)}
              />
              <Input
                label="STIR"
                value={values.taxId}
                onChange={(event) => patchValue("taxId", event.target.value)}
              />
            </>
          )}
          <Input
            label="Telefon"
            value={values.phone}
            required
            error={errors.phone}
            onChange={(event) => patchValue("phone", event.target.value)}
          />
          <Input
            label="Email"
            value={values.email}
            error={errors.email}
            onChange={(event) => patchValue("email", event.target.value)}
          />
          <Input
            label="Region"
            value={values.region}
            onChange={(event) => patchValue("region", event.target.value)}
          />
          <Select
            label="Agent"
            value={values.agentId || ""}
            options={agentOptions}
            onChange={(event) => patchValue("agentId", event.target.value || null)}
          />
          <Select
            label="Segment"
            value={values.segment}
            options={SEGMENT_OPTIONS}
            onChange={(event) => patchValue("segment", event.target.value)}
          />
          <Select
            label="Source"
            value={values.source}
            options={SOURCE_OPTIONS}
            onChange={(event) => patchValue("source", event.target.value)}
          />
          <Input
            label="Credit limit"
            type="number"
            min="0"
            value={values.creditLimit}
            error={errors.creditLimit}
            onChange={(event) => patchValue("creditLimit", event.target.value)}
          />
          <Input
            label="Payment term days"
            type="number"
            min="0"
            value={values.paymentTermDays}
            error={errors.paymentTermDays}
            onChange={(event) => patchValue("paymentTermDays", event.target.value)}
          />
          <Input
            label="Tags"
            value={Array.isArray(values.tags) ? values.tags.join(", ") : values.tags}
            hint="Vergul bilan ajrating"
            onChange={(event) => patchValue("tags", event.target.value)}
          />
          <Input
            label="Birthday"
            type="date"
            value={values.birthday || ""}
            onChange={(event) => patchValue("birthday", event.target.value)}
          />
        </div>

        {duplicatePhone && (
          <div className="customer-form__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={16} />
            <span>
              Duplicate phone: <b>{duplicatePhone.name || duplicatePhone.phone}</b>
            </span>
          </div>
        )}

        <Textarea
          label="Address"
          value={values.address}
          rows={2}
          onChange={(event) => patchValue("address", event.target.value)}
        />

        <Textarea
          label="Note"
          value={values.note}
          rows={3}
          onChange={(event) => patchValue("note", event.target.value)}
        />

        <div className="customer-form__footer">
          <Badge variant="neutral">LocalStorage CRM</Badge>
          <div>
            <Button type="button" variant="secondary" leftIcon={<X size={17} />} onClick={onCancel}>
              Bekor
            </Button>
            <Button type="submit" leftIcon={<Save size={17} />}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CustomerForm;
