import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

const STORAGE_KEY = "agents";

const ARRAY_FIELDS = ["customerIds", "orderIds", "paymentIds"];
const NULLABLE_ID_FIELDS = ["vehicleId", "warehouseId"];
const NUMBER_FIELDS = [
  "targetAmount",
  "commissionPercent",
  "cashBalance",
  "salesAmount",
  "collectedAmount",
  "debtAmount",
  "commissionAmount",
];

export const AGENT_DEFAULTS = {
  id: "",
  name: "",
  phone: "",
  email: "",
  status: "ACTIVE",
  region: "",
  route: "",
  note: "",
  targetAmount: 0,
  commissionPercent: 0,
  cashBalance: 0,
  customerIds: [],
  orderIds: [],
  paymentIds: [],
  vehicleId: null,
  warehouseId: null,
  salesAmount: 0,
  collectedAmount: 0,
  debtAmount: 0,
  commissionAmount: 0,
  lastVisitAt: null,
  lastOrderAt: null,
  lastPaymentAt: null,
  createdAt: null,
  updatedAt: null,
};

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const createId = () => `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const normalizeAgent = (agent = {}) => {
  const normalized = {
    ...AGENT_DEFAULTS,
    ...agent,
  };

  NUMBER_FIELDS.forEach((field) => {
    normalized[field] = toFiniteNumber(normalized[field]);
  });

  ARRAY_FIELDS.forEach((field) => {
    normalized[field] = toArray(normalized[field]);
  });

  NULLABLE_ID_FIELDS.forEach((field) => {
    normalized[field] = normalized[field] || null;
  });

  normalized.id = String(normalized.id || createId());
  normalized.name = String(normalized.name || "").trim();
  normalized.phone = String(normalized.phone || "").trim();
  normalized.email = String(normalized.email || "").trim();
  normalized.region = String(normalized.region || "").trim();
  normalized.route = String(normalized.route || "").trim();
  normalized.note = String(normalized.note || "").trim();
  normalized.status = normalized.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  normalized.createdAt = normalized.createdAt || new Date().toISOString();
  normalized.updatedAt = normalized.updatedAt || normalized.createdAt;

  return normalized;
};

const readAgents = () => {
  const remoteAgents = unwrapList(getCachedApiResponse("/agents"), ["agents"]);
  if (Array.isArray(remoteAgents)) {
    tenantSet(STORAGE_KEY, remoteAgents);
    return remoteAgents.map(normalizeAgent);
  }
  if (!canUseStorage()) {
    return [];
  }

  try {
    const agents = tenantGet(STORAGE_KEY, null);

    if (!agents) {
      tenantSet(STORAGE_KEY, []);
      return [];
    }

    if (!Array.isArray(agents)) {
      tenantSet(STORAGE_KEY, []);

      return [];
    }

    const normalizedAgents = agents.map(normalizeAgent);
    tenantSet(STORAGE_KEY, normalizedAgents);

    return normalizedAgents;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Agents storage read error:", error);
    }

    return [];
  }
};

export const getStoredAgents = () => readAgents();

export const saveAgents = (agents) => {
  if (!canUseStorage() || !Array.isArray(agents)) {
    return false;
  }

  tenantSet(STORAGE_KEY, agents.map(normalizeAgent));
  window.dispatchEvent(new Event("agents:changed"));

  return true;
};

export const getAgentById = (agentId) => {
  return getStoredAgents().find((agent) => agent.id === agentId) || null;
};

export const createAgent = async (values) => {
  const remoteAgent = await apiRequest("/agents", {
    method: "POST",
    body: values,
  });
  if (remoteAgent?.id) {
    const agents = getStoredAgents();
    saveAgents([remoteAgent, ...agents.filter((agent) => agent.id !== remoteAgent.id)]);
    return normalizeAgent(remoteAgent);
  }
  const agents = getStoredAgents();
  const now = new Date().toISOString();

  const agent = normalizeAgent({
    ...values,
    id: values.id || createId(),
    createdAt: now,
    updatedAt: now,
  });

  saveAgents([agent, ...agents]);

  return agent;
};

export const updateAgent = async (updatedAgent) => {
  const remoteAgent = updatedAgent?.id ? await apiRequest(`/agents/${updatedAgent.id}`, {
    method: "PATCH",
    body: updatedAgent,
  }) : null;
  if (remoteAgent?.id) {
    const agents = getStoredAgents();
    saveAgents(agents.map((agent) => (agent.id === remoteAgent.id ? remoteAgent : agent)));
    return normalizeAgent(remoteAgent);
  }
  const agents = getStoredAgents();
  let savedAgent = null;

  const next = agents.map((agent) => {
    if (agent.id !== updatedAgent.id) {
      return agent;
    }

    savedAgent = normalizeAgent({
      ...agent,
      ...updatedAgent,
      id: agent.id,
      createdAt: agent.createdAt,
      updatedAt: new Date().toISOString(),
    });

    return savedAgent;
  });

  saveAgents(next);

  return savedAgent;
};

export const toggleAgentStatus = async (agentId) => {
  const agent = getAgentById(agentId);

  if (!agent) {
    return null;
  }

  return updateAgent({
    ...agent,
    status: agent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
  });
};

export const deleteAgent = async (agentId) => {
  await apiRequest(`/agents/${agentId}`, {
    method: "DELETE",
  });
  const agents = getStoredAgents();

  saveAgents(agents.filter((agent) => agent.id !== agentId));
};
