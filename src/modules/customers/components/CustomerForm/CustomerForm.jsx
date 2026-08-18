import { useMemo, useState } from "react";
import { AlertTriangle, Save, X } from "lucide-react";
import { getStoredAgents } from "../../../agents/utils/agentsStorage";
import { Badge, Button, Card, Input, LiveIcon, Select, Textarea } from "../../../../shared/ui";
import { CUSTOMER_SEGMENTS, CUSTOMER_SOURCES, getStoredCustomers, normalizeCustomer } from "../../utils/customersStorage";
import "./CustomerForm.scss";
import { translateText } from "../../../../localization/i18n";
const TYPE_OPTIONS = [{
  value: "INDIVIDUAL",
  text: "Jismoniy shaxs"
}, {
  value: "COMPANY",
  text: "Kompaniya"
}];
const STATUS_OPTIONS = [{
  value: "ACTIVE",
  text: "Faol"
}, {
  value: "INACTIVE",
  text: "Faol emas"
}];
const CUSTOMER_SEGMENT_LABELS = {
  VIP: "VIP",
  REGULAR: "Doimiy",
  NEW: "Yangi",
  RISK: "Riskli",
  INACTIVE: "Faol emas"
};
const CUSTOMER_SOURCE_LABELS = {
  WALK_IN: "Do'kondan",
  PHONE: "Telefon",
  TELEGRAM: "Telegram",
  REFERRAL: "Tavsiya",
  AGENT: "Agent",
  OTHER: "Boshqa"
};
const isValidEmail = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const CustomerForm = ({
  initialCustomer,
  onSubmit,
  onCancel,
  submitLabel = translateText("Saqlash")
}) => {
  const normalizedInitial = normalizeCustomer(initialCustomer || {});
  const [values, setValues] = useState(normalizedInitial);
  const [errors, setErrors] = useState({});
  const agents = useMemo(() => getStoredAgents(), []);
  const typeOptions = TYPE_OPTIONS.map(option => ({
    ...option,
    label: translateText(option.text)
  }));
  const statusOptions = STATUS_OPTIONS.map(option => ({
    ...option,
    label: translateText(option.text)
  }));
  const segmentOptions = CUSTOMER_SEGMENTS.map(segment => ({
    value: segment,
    label: translateText(CUSTOMER_SEGMENT_LABELS[segment] || segment)
  }));
  const sourceOptions = CUSTOMER_SOURCES.map(source => ({
    value: source,
    label: translateText(CUSTOMER_SOURCE_LABELS[source] || source)
  }));
  const activeAgents = agents.filter(agent => agent.status === "ACTIVE");
  const selectedInactiveAgent = agents.find(agent => agent.id === values.agentId && agent.status !== "ACTIVE");
  const agentOptions = [{
    value: "",
    label: translateText("Agent tanlanmagan")
  }, ...activeAgents.map(agent => ({
    value: agent.id,
    label: agent.name || agent.phone || agent.id
  })), ...(selectedInactiveAgent ? [{
    value: selectedInactiveAgent.id,
    label: `${selectedInactiveAgent.name || selectedInactiveAgent.id} (${translateText("Faol emas")})`
  }] : [])];
  const duplicatePhone = useMemo(() => {
    const phone = values.phone.trim();
    if (!phone) {
      return null;
    }
    return getStoredCustomers().find(customer => customer.id !== values.id && customer.phone.trim() === phone) || null;
  }, [values.id, values.phone]);
  const patchValue = (field, value) => {
    setValues(current => ({
      ...current,
      [field]: value
    }));
    setErrors(current => ({
      ...current,
      [field]: ""
    }));
  };
  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) {
      nextErrors.name = translateText("Ism yoki mijoz nomi majburiy.");
    }
    if (!values.phone.trim()) {
      nextErrors.phone = translateText("Telefon majburiy.");
    } else if (duplicatePhone) {
      nextErrors.phone = translateText("Bu telefon raqam bilan mijoz mavjud.");
    }
    if (!isValidEmail(values.email.trim())) {
      nextErrors.email = translateText("Email formati noto'g'ri.");
    }
    if (Number(values.creditLimit || 0) < 0) {
      nextErrors.creditLimit = translateText("Kredit limiti manfiy bo'lmasin.");
    }
    if (Number(values.paymentTermDays || 0) < 0) {
      nextErrors.paymentTermDays = translateText("To'lov muddati manfiy bo'lmasin.");
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleSubmit = event => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    onSubmit(normalizeCustomer({
      ...values,
      tags: values.tags,
      creditLimit: Number(values.creditLimit || 0),
      paymentTermDays: Number(values.paymentTermDays || 0)
    }));
  };
  return <Card padding="lg" className="customer-form">
      <form onSubmit={handleSubmit}>
        <div className="customer-form__grid">
          <Select label={translateText("Mijoz turi")} value={values.type} options={typeOptions} onChange={event => patchValue("type", event.target.value)} />
          <Select label={translateText("Holat")} value={values.status} options={statusOptions} onChange={event => patchValue("status", event.target.value)} />
          <Input label={values.type === "COMPANY" ? translateText("Mijoz nomi") : translateText("To'liq ism")} value={values.name} required error={errors.name} onChange={event => patchValue("name", event.target.value)} />
          {values.type === "COMPANY" && <>
              <Input label={translateText("Kompaniya nomi")} value={values.companyName} onChange={event => patchValue("companyName", event.target.value)} />
              <Input label={translateText("Aloqa uchun shaxs")} value={values.contactPerson} onChange={event => patchValue("contactPerson", event.target.value)} />
              <Input label={translateText("STIR")} value={values.taxId} onChange={event => patchValue("taxId", event.target.value)} />
            </>}
          <Input label={translateText("Telefon")} value={values.phone} required error={errors.phone} onChange={event => patchValue("phone", event.target.value)} />
          <Input label={translateText("Email")} value={values.email} error={errors.email} onChange={event => patchValue("email", event.target.value)} />
          <Input label={translateText("Hudud")} value={values.region} onChange={event => patchValue("region", event.target.value)} />
          <Select label={translateText("Agent")} value={values.agentId || ""} options={agentOptions} onChange={event => patchValue("agentId", event.target.value || null)} />
          <Select label={translateText("Toifa")} value={values.segment} options={segmentOptions} onChange={event => patchValue("segment", event.target.value)} />
          <Select label={translateText("Manba")} value={values.source} options={sourceOptions} onChange={event => patchValue("source", event.target.value)} />
          <Input label={translateText("Kredit limiti")} type="number" min="0" value={values.creditLimit} error={errors.creditLimit} onChange={event => patchValue("creditLimit", event.target.value)} />
          <Input label={translateText("To'lov muddati (kun)")} type="number" min="0" value={values.paymentTermDays} error={errors.paymentTermDays} onChange={event => patchValue("paymentTermDays", event.target.value)} />
          <Input label={translateText("Teglar")} value={Array.isArray(values.tags) ? values.tags.join(", ") : values.tags} hint={translateText("Vergul bilan ajrating")} onChange={event => patchValue("tags", event.target.value)} />
          <Input label={translateText("Tug'ilgan sana")} type="date" value={values.birthday || ""} onChange={event => patchValue("birthday", event.target.value)} />
        </div>

        {duplicatePhone && <div className="customer-form__warning">
            <LiveIcon icon={AlertTriangle} motion="warning-glow" size={16} />
            <span>{translateText("Takror telefon:")}<b>{duplicatePhone.name || duplicatePhone.phone}</b>
            </span>
          </div>}

        <Textarea label={translateText("Manzil")} value={values.address} rows={2} onChange={event => patchValue("address", event.target.value)} />

        <Textarea label={translateText("Izoh")} value={values.note} rows={3} onChange={event => patchValue("note", event.target.value)} />

        <div className="customer-form__footer">
          <Badge variant="neutral">{translateText("Brauzer xotirasidagi CRM")}</Badge>
          <div>
            <Button type="button" variant="secondary" leftIcon={<X size={17} />} onClick={onCancel}>{translateText("Bekor")}</Button>
            <Button type="submit" leftIcon={<Save size={17} />}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Card>;
};
export default CustomerForm;
