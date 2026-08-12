const toFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

export const calculateAgentPerformance = ({ agent, orders = [] }) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  const agentOrders = safeOrders.filter(
    (order) => order.agentId === agent.id && order.status !== "CANCELLED",
  );

  const salesAmount = agentOrders.reduce(
    (total, order) => total + toFiniteNumber(order.total ?? order.totalAmount),
    0,
  );

  const target = toFiniteNumber(agent.targetAmount);
  const rawProgress = target > 0 ? (salesAmount / target) * 100 : 0;
  const progress = Number.isFinite(rawProgress) ? rawProgress : 0;
  const commissionPercent = toFiniteNumber(agent.commissionPercent);
  const commissionAmount = salesAmount * (commissionPercent / 100);

  return {
    ordersCount: agentOrders.length,
    salesAmount,
    target,
    progress,
    progressBar: Math.max(0, Math.min(progress, 100)),
    remaining: Math.max(target - salesAmount, 0),
    commissionAmount,
    estimatedCommission: commissionAmount,
  };
};
