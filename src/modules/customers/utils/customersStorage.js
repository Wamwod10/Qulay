const STORAGE_KEY = "universal_erp_customers";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const normalizeCustomer = (customer = {}) => ({
  ...customer,
  id: String(customer.id || `cus-${Date.now()}-${Math.random().toString(16).slice(2)}`),
  name: String(customer.name || customer.fullName || customer.companyName || "").trim(),
  phone: String(customer.phone || "").trim(),
  email: String(customer.email || "").trim(),
  status: customer.status || "ACTIVE",
  agentId: customer.agentId || null,
  createdAt: customer.createdAt || new Date().toISOString(),
  updatedAt: customer.updatedAt || customer.createdAt || new Date().toISOString(),
});

const readCustomers = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const customers = JSON.parse(storedValue);

    if (!Array.isArray(customers)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const normalizedCustomers = customers.map(normalizeCustomer);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedCustomers));

    return normalizedCustomers;
  } catch (error) {
    console.error("Customers storage read error:", error);

    return [];
  }
};

export const getStoredCustomers = () => readCustomers();

export const saveCustomers = (customers) => {
  if (!canUseStorage() || !Array.isArray(customers)) {
    return false;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(customers.map(normalizeCustomer)),
  );

  return true;
};

export const getCustomerById = (customerId) => {
  return getStoredCustomers().find((customer) => customer.id === customerId) || null;
};

export const createCustomer = (customer) => {
  const customers = getStoredCustomers();
  const now = new Date().toISOString();

  const newCustomer = normalizeCustomer({
    ...customer,
    id: customer.id || `cus-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    updatedAt: now,
  });

  saveCustomers([newCustomer, ...customers]);

  return newCustomer;
};

export const updateCustomer = (updatedCustomer) => {
  const customers = getStoredCustomers();
  let savedCustomer = null;

  const next = customers.map((customer) => {
    if (customer.id !== updatedCustomer.id) {
      return customer;
    }

    savedCustomer = normalizeCustomer({
      ...customer,
      ...updatedCustomer,
      updatedAt: new Date().toISOString(),
    });

    return savedCustomer;
  });

  saveCustomers(next);

  return savedCustomer;
};

export const deleteCustomer = (customerId) => {
  const next = getStoredCustomers().filter((customer) => customer.id !== customerId);

  saveCustomers(next);
};
