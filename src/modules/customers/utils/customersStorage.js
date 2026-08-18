import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";
const STORAGE_KEY = "customers";
const FOLLOW_UPS_KEY = "customer_followups";
const canUseStorage = () => typeof window !== "undefined" && window.localStorage;
const createId = (prefix = "cus") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const toSafeMoney = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};
const toArray = value => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }
  return [];
};
const normalizeStatus = status => String(status || "").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
const normalizeType = type => {
  const value = String(type || "").toUpperCase();
  if (["COMPANY", "LEGAL", "B2B"].includes(value)) {
    return "COMPANY";
  }
  return "INDIVIDUAL";
};
export const CUSTOMER_SEGMENTS = ["VIP", "REGULAR", "NEW", "RISK", "INACTIVE"];
export const CUSTOMER_SOURCES = ["WALK_IN", "PHONE", "TELEGRAM", "REFERRAL", "AGENT", "OTHER"];
export const normalizeCustomer = (customer = {}) => ({
  ...customer,
  id: String(customer.id || createId("cus")),
  type: normalizeType(customer.type || customer.customerType),
  name: String(customer.name || customer.fullName || customer.companyName || "").trim(),
  fullName: String(customer.fullName || customer.name || "").trim(),
  companyName: String(customer.companyName || "").trim(),
  contactPerson: String(customer.contactPerson || "").trim(),
  taxId: String(customer.taxId || customer.stir || customer.STIR || "").trim(),
  phone: String(customer.phone || "").trim(),
  email: String(customer.email || "").trim(),
  address: String(customer.address || "").trim(),
  region: String(customer.region || "").trim(),
  status: normalizeStatus(customer.status),
  note: String(customer.note || "").trim(),
  agentId: customer.agentId || null,
  segment: CUSTOMER_SEGMENTS.includes(String(customer.segment || "").toUpperCase()) ? String(customer.segment).toUpperCase() : "REGULAR",
  source: CUSTOMER_SOURCES.includes(String(customer.source || "").toUpperCase()) ? String(customer.source).toUpperCase() : "OTHER",
  birthday: customer.birthday || "",
  tags: toArray(customer.tags),
  creditLimit: toSafeMoney(customer.creditLimit),
  paymentTermDays: toSafeMoney(customer.paymentTermDays),
  loyaltyPoints: toSafeMoney(customer.loyaltyPoints),
  bonusBalance: toSafeMoney(customer.bonusBalance),
  lastContactAt: customer.lastContactAt || null,
  nextFollowUpAt: customer.nextFollowUpAt || null,
  createdAt: customer.createdAt || new Date().toISOString(),
  updatedAt: customer.updatedAt || customer.createdAt || new Date().toISOString()
});
export const getCustomerDisplayName = customer => customer?.companyName || customer?.name || customer?.fullName || customer?.phone || customer?.id || "Mijoz";
const readCustomers = () => {
  const remoteCustomers = unwrapList(getCachedApiResponse("/customers"), ["customers"]);
  if (Array.isArray(remoteCustomers)) {
    tenantSet(STORAGE_KEY, remoteCustomers);
    return remoteCustomers.map(normalizeCustomer);
  }
  if (!canUseStorage()) {
    return [];
  }
  try {
    const customers = tenantGet(STORAGE_KEY, null);
    if (!customers) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }
    if (!Array.isArray(customers)) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }
    const normalizedCustomers = customers.map(normalizeCustomer);
    tenantSet(STORAGE_KEY, normalizedCustomers);
    return normalizedCustomers;
  } catch (error) {
    console.error("Customers storage read error:", error);
    return [];
  }
};
export const getStoredCustomers = () => readCustomers();
export const saveCustomers = customers => {
  if (!canUseStorage() || !Array.isArray(customers)) {
    return false;
  }
  tenantSet(STORAGE_KEY, customers.map(normalizeCustomer));
  window.dispatchEvent(new Event("customers:changed"));
  return true;
};
export const getCustomerById = customerId => {
  return getStoredCustomers().find(customer => customer.id === customerId) || null;
};
export const createCustomer = async customer => {
  const remoteCustomer = await apiRequest("/customers", {
    method: "POST",
    body: customer
  });
  if (remoteCustomer?.id) {
    const customers = getStoredCustomers();
    saveCustomers([remoteCustomer, ...customers.filter(item => item.id !== remoteCustomer.id)]);
    return normalizeCustomer(remoteCustomer);
  }
  const customers = getStoredCustomers();
  const now = new Date().toISOString();
  const newCustomer = normalizeCustomer({
    ...customer,
    id: customer.id || createId("cus"),
    createdAt: now,
    updatedAt: now
  });
  saveCustomers([newCustomer, ...customers]);
  return newCustomer;
};
export const updateCustomer = async updatedCustomer => {
  const remoteCustomer = updatedCustomer?.id ? await apiRequest(`/customers/${updatedCustomer.id}`, {
    method: "PATCH",
    body: updatedCustomer
  }) : null;
  if (remoteCustomer?.id) {
    const customers = getStoredCustomers();
    saveCustomers(customers.map(customer => customer.id === remoteCustomer.id ? remoteCustomer : customer));
    return normalizeCustomer(remoteCustomer);
  }
  const customers = getStoredCustomers();
  let savedCustomer = null;
  const next = customers.map(customer => {
    if (customer.id !== updatedCustomer.id) {
      return customer;
    }
    savedCustomer = normalizeCustomer({
      ...customer,
      ...updatedCustomer,
      updatedAt: new Date().toISOString()
    });
    return savedCustomer;
  });
  saveCustomers(next);
  return savedCustomer;
};
export const deleteCustomer = async customerId => {
  await apiRequest(`/customers/${customerId}`, {
    method: "DELETE"
  });
  const next = getStoredCustomers().filter(customer => customer.id !== customerId);
  saveCustomers(next);
};
export const deactivateCustomer = async customerId => updateCustomer({
  id: customerId,
  status: "INACTIVE"
});
const readFollowUps = () => {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const followUps = tenantGet(FOLLOW_UPS_KEY, null);
    if (!followUps) {
      tenantSet(FOLLOW_UPS_KEY, []);
      return [];
    }
    if (!Array.isArray(followUps)) {
      tenantSet(FOLLOW_UPS_KEY, []);
      return [];
    }
    return followUps.map(normalizeCustomerFollowUp);
  } catch (error) {
    console.error("Customer follow-up storage read error:", error);
    return [];
  }
};
export const normalizeCustomerFollowUp = (followUp = {}) => ({
  ...followUp,
  id: String(followUp.id || createId("follow")),
  customerId: followUp.customerId || null,
  type: ["CALL", "MEETING", "PAYMENT", "SALES", "OTHER"].includes(followUp.type) ? followUp.type : "OTHER",
  status: ["OPEN", "DONE", "CANCELLED"].includes(followUp.status) ? followUp.status : "OPEN",
  date: followUp.date || new Date().toISOString().slice(0, 10),
  note: String(followUp.note || "").trim(),
  createdAt: followUp.createdAt || new Date().toISOString(),
  updatedAt: followUp.updatedAt || followUp.createdAt || new Date().toISOString()
});
export const getStoredCustomerFollowUps = () => readFollowUps();
export const saveCustomerFollowUps = followUps => {
  if (!canUseStorage() || !Array.isArray(followUps)) {
    return false;
  }
  tenantSet(FOLLOW_UPS_KEY, followUps.map(normalizeCustomerFollowUp));
  window.dispatchEvent(new Event("customers:changed"));
  return true;
};
export const addCustomerFollowUp = followUp => {
  const normalized = normalizeCustomerFollowUp({
    ...followUp,
    id: followUp.id || createId("follow"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  saveCustomerFollowUps([normalized, ...getStoredCustomerFollowUps()]);
  if (normalized.status === "OPEN") {
    updateCustomer({
      id: normalized.customerId,
      lastContactAt: new Date().toISOString(),
      nextFollowUpAt: normalized.date
    });
  }
  return normalized;
};
export const updateCustomerFollowUp = updatedFollowUp => {
  let saved = null;
  const next = getStoredCustomerFollowUps().map(followUp => {
    if (followUp.id !== updatedFollowUp.id) {
      return followUp;
    }
    saved = normalizeCustomerFollowUp({
      ...followUp,
      ...updatedFollowUp,
      updatedAt: new Date().toISOString()
    });
    return saved;
  });
  saveCustomerFollowUps(next);
  return saved;
};
