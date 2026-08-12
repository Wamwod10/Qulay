import { INITIAL_AGENTS } from "../constants/agentsMock";

const STORAGE_KEY = "universal_erp_agents";

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
  if (!canUseStorage()) {
    return INITIAL_AGENTS.map(normalizeAgent);
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      const initialAgents = INITIAL_AGENTS.map(normalizeAgent);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAgents));

      return initialAgents;
    }

    const agents = JSON.parse(storedValue);

    if (!Array.isArray(agents)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      return [];
    }

    const normalizedAgents = agents.map(normalizeAgent);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedAgents));

    return normalizedAgents;
  } catch (error) {
    console.error("Agents storage read error:", error);

    return INITIAL_AGENTS.map(normalizeAgent);
  }
};

export const getStoredAgents = () => readAgents();

export const saveAgents = (agents) => {
  if (!canUseStorage() || !Array.isArray(agents)) {
    return false;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(agents.map(normalizeAgent)),
  );

  return true;
};

export const getAgentById = (agentId) => {
  return getStoredAgents().find((agent) => agent.id === agentId) || null;
};

export const createAgent = (values) => {
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

export const updateAgent = (updatedAgent) => {
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

export const toggleAgentStatus = (agentId) => {
  const agent = getAgentById(agentId);

  if (!agent) {
    return null;
  }

  return updateAgent({
    ...agent,
    status: agent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
  });
};

export const deleteAgent = (agentId) => {
  const agents = getStoredAgents();

  saveAgents(agents.filter((agent) => agent.id !== agentId));
};
