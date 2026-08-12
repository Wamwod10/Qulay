import {
  getStoredCustomers,
  saveCustomers,
} from "../../customers/utils/customersStorage";
import { getStoredPayments } from "../../finance/utils/paymentsStorage";
import { getStoredOrders } from "../../sales/utils/ordersStorage";

import {
  getAgentById,
  getStoredAgents,
  saveAgents,
} from "./agentsStorage";

const sumBy = (items, getter) =>
  items.reduce((total, item) => {
    const value = Number(getter(item) || 0);

    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

export const getCustomerDisplayName = (customer) => {
  if (!customer) {
    return "Mijoz";
  }

  return (
    customer.name ||
    customer.fullName ||
    customer.companyName ||
    customer.phone ||
    customer.id ||
    "Mijoz"
  );
};

export const getCustomersCatalog = () => getStoredCustomers();

export const getAgentCustomers = (agentId) => {
  const agent = getAgentById(agentId);
  const compatibilityIds = new Set(agent?.customerIds || []);

  return getStoredCustomers().filter(
    (customer) => customer.agentId === agentId || (!customer.agentId && compatibilityIds.has(customer.id)),
  );
};

export const getCustomersByAgent = getAgentCustomers;

export const getAssignableCustomersForAgent = (agentId) => {
  const assignedCustomerIds = new Set(getAgentCustomers(agentId).map((customer) => customer.id));

  return getStoredCustomers().filter(
    (customer) =>
      customer.agentId === agentId || (!customer.agentId && !assignedCustomerIds.has(customer.id)),
  );
};

const syncAgentCustomerCache = (agentId) => {
  const agentCustomers = getStoredCustomers()
    .filter((customer) => customer.agentId === agentId)
    .map((customer) => customer.id);

  const nextAgents = getStoredAgents().map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          customerIds: agentCustomers,
          updatedAt: new Date().toISOString(),
        }
      : agent,
  );

  saveAgents(nextAgents);
};

export const assignCustomerToAgent = ({ customerId, agentId }) => {
  const customers = getStoredCustomers();
  let updatedCustomer = null;
  const previousAgentId =
    customers.find((customer) => customer.id === customerId)?.agentId || null;

  const next = customers.map((customer) => {
    if (customer.id !== customerId) {
      return customer;
    }

    updatedCustomer = {
      ...customer,
      agentId: agentId || null,
      updatedAt: new Date().toISOString(),
    };

    return updatedCustomer;
  });

  saveCustomers(next);

  if (previousAgentId) {
    syncAgentCustomerCache(previousAgentId);
  }

  if (agentId) {
    syncAgentCustomerCache(agentId);
  }

  return updatedCustomer;
};

export const unassignCustomerFromAgent = (customerId) => {
  return assignCustomerToAgent({
    customerId,
    agentId: null,
  });
};

export const getAgentOrders = (agentId) => {
  const agent = getAgentById(agentId);
  const compatibilityIds = new Set(agent?.orderIds || []);

  return getStoredOrders().filter(
    (order) => order.agentId === agentId || (!order.agentId && compatibilityIds.has(order.id)),
  );
};

export const getAgentPayments = (agentId) => {
  const agent = getAgentById(agentId);
  const compatibilityIds = new Set(agent?.paymentIds || []);

  return getStoredPayments().filter(
    (payment) =>
      payment.agentId === agentId || (!payment.agentId && compatibilityIds.has(payment.id)),
  );
};

export const getAgentSalesTotal = (agentId) => {
  return sumBy(getAgentOrders(agentId), (order) => order.total ?? order.totalAmount);
};

export const getAgentCollectedAmount = (agentId) => {
  return sumBy(getAgentPayments(agentId), (payment) => payment.amount);
};

export const getAgentDebt = (agentId) => {
  return Math.max(getAgentSalesTotal(agentId) - getAgentCollectedAmount(agentId), 0);
};

export const getAgentCommissionAmount = (agentId) => {
  const agent = getAgentById(agentId);
  const commissionPercent = Number(agent?.commissionPercent || 0);

  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
    return 0;
  }

  return getAgentSalesTotal(agentId) * (commissionPercent / 100);
};

export const getAgentDeleteSafety = (agentId) => {
  const customers = getAgentCustomers(agentId);
  const orders = getAgentOrders(agentId);
  const payments = getAgentPayments(agentId);
  const blockingReasons = [];

  if (customers.length) {
    blockingReasons.push(`${customers.length} ta mijoz biriktirilgan`);
  }

  if (orders.length) {
    blockingReasons.push(`${orders.length} ta buyurtma bog'langan`);
  }

  if (payments.length) {
    blockingReasons.push(`${payments.length} ta to'lov bog'langan`);
  }

  return {
    canDelete: blockingReasons.length === 0,
    customersCount: customers.length,
    ordersCount: orders.length,
    paymentsCount: payments.length,
    blockingReasons,
  };
};

export const mapAgentToOption = (agent) => {
  return {
    label: agent?.name || agent?.phone || "",
    value: agent?.id,
  };
};
