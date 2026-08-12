import {
  calculateActualProductionCost,
  calculateActualUnitCost,
  positiveNumber,
} from "../../manufacturing/utils/productionCost";

const pad = (value) => String(value).padStart(2, "0");

export const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

export const parseProductionDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const raw = String(value).trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const localMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);

  if (localMatch) {
    const [, day, month, year, hour = 0, minute = 0] = localMatch.map(Number);
    const date = new Date(year, month - 1, day, hour, minute);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const getProductionReportDate = (order) =>
  parseProductionDate(order.completedAt) ||
  parseProductionDate(order.plannedDate) ||
  parseProductionDate(order.createdAt);

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

export const getPresetRange = (preset, customFrom = "", customTo = "") => {
  const today = new Date();

  if (preset === "today") {
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  }

  if (preset === "week") {
    const dayOffset = (today.getDay() + 6) % 7;
    const from = startOfDay(today);

    from.setDate(from.getDate() - dayOffset);

    return {
      from,
      to: endOfDay(today),
    };
  }

  if (preset === "month") {
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: endOfDay(today),
    };
  }

  if (preset === "year") {
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: endOfDay(today),
    };
  }

  if (preset === "custom") {
    const from = parseProductionDate(customFrom);
    const to = parseProductionDate(customTo);

    return {
      from: from ? startOfDay(from) : null,
      to: to ? endOfDay(to) : null,
    };
  }

  return {
    from: null,
    to: null,
  };
};

const isInRange = (date, range) => {
  if (!date) {
    return true;
  }

  if (range.from && date < range.from) {
    return false;
  }

  if (range.to && date > range.to) {
    return false;
  }

  return true;
};

const getCompletedOrderCost = (order) => {
  const actualMaterialCost = positiveNumber(order.actualMaterialCost);
  const overheadCost = positiveNumber(order.overheadCost);
  const actualProductionCost = positiveNumber(
    order.actualProductionCost ??
      calculateActualProductionCost({
        actualMaterialCost,
        overheadCost,
      }),
  );

  return {
    actualMaterialCost,
    overheadCost,
    actualProductionCost,
    actualUnitCost: positiveNumber(
      order.actualUnitCost ??
        calculateActualUnitCost({
          actualProductionCost,
          producedQuantity: order.producedQuantity,
        }),
    ),
  };
};

export const buildManufacturingReport = ({
  orders = [],
  period = "month",
  from = "",
  to = "",
  productId = "",
  status = "",
}) => {
  const range = getPresetRange(period, from, to);

  const filteredOrders = orders
    .filter((order) => order.status !== "CANCELLED")
    .filter((order) => !productId || order.productId === productId)
    .filter((order) => !status || order.status === status)
    .filter((order) => isInRange(getProductionReportDate(order), range));

  const completedOrders = filteredOrders.filter(
    (order) => order.status === "COMPLETED",
  );

  const totals = completedOrders.reduce(
    (summary, order) => {
      const costs = getCompletedOrderCost(order);

      summary.producedQuantity += positiveNumber(order.producedQuantity);
      summary.defectQuantity += positiveNumber(order.defectQuantity);
      summary.wasteQuantity += positiveNumber(order.wasteQuantity);
      summary.actualMaterialCost += costs.actualMaterialCost;
      summary.overheadCost += costs.overheadCost;
      summary.actualProductionCost += costs.actualProductionCost;

      return summary;
    },
    {
      producedQuantity: 0,
      defectQuantity: 0,
      wasteQuantity: 0,
      actualMaterialCost: 0,
      overheadCost: 0,
      actualProductionCost: 0,
    },
  );

  const productMap = new Map();

  completedOrders.forEach((order) => {
    const current =
      productMap.get(order.productId) || {
        id: order.productId,
        productName: order.productName,
        producedQuantity: 0,
      };

    current.producedQuantity += positiveNumber(order.producedQuantity);

    productMap.set(order.productId, current);
  });

  return {
    filteredOrders,
    completedOrders,
    kpi: {
      totalOrders: filteredOrders.length,
      planned: filteredOrders.filter((order) => order.status === "PLANNED")
        .length,
      inProgress: filteredOrders.filter(
        (order) => order.status === "IN_PROGRESS",
      ).length,
      completed: completedOrders.length,
      producedQuantity: totals.producedQuantity,
      defectQuantity: totals.defectQuantity,
      wasteQuantity: totals.wasteQuantity,
      actualMaterialCost: totals.actualMaterialCost,
      overheadCost: totals.overheadCost,
      actualProductionCost: totals.actualProductionCost,
      averageUnitCost: calculateActualUnitCost({
        actualProductionCost: totals.actualProductionCost,
        producedQuantity: totals.producedQuantity,
      }),
    },
    planActualRows: completedOrders.map((order) => {
      const plannedQuantity = positiveNumber(order.plannedQuantity);
      const producedQuantity = positiveNumber(order.producedQuantity);
      const difference = producedQuantity - plannedQuantity;

      return {
        id: order.id,
        productName: order.productName,
        plannedQuantity,
        producedQuantity,
        difference,
        percent: plannedQuantity > 0 ? (difference / plannedQuantity) * 100 : 0,
        unit: order.unit,
      };
    }),
    defectWasteRows: completedOrders.map((order) => {
      const producedQuantity = positiveNumber(order.producedQuantity);
      const defectQuantity = positiveNumber(order.defectQuantity);
      const wasteQuantity = positiveNumber(order.wasteQuantity);
      const totalOutput = producedQuantity + defectQuantity + wasteQuantity;

      return {
        id: order.id,
        productName: order.productName,
        defectQuantity,
        wasteQuantity,
        defectRate: totalOutput > 0 ? (defectQuantity / totalOutput) * 100 : 0,
        wasteRate: totalOutput > 0 ? (wasteQuantity / totalOutput) * 100 : 0,
        unit: order.unit,
      };
    }),
    costRows: completedOrders.map((order) => {
      const costs = getCompletedOrderCost(order);

      return {
        id: order.id,
        productName: order.productName,
        plannedMaterialCost: positiveNumber(
          order.plannedMaterialCost ?? order.materialCost,
        ),
        ...costs,
      };
    }),
    topProducts: Array.from(productMap.values())
      .sort((first, second) => second.producedQuantity - first.producedQuantity)
      .slice(0, 5),
    recentOrders: [...filteredOrders]
      .sort((first, second) => {
        const firstDate = getProductionReportDate(first);
        const secondDate = getProductionReportDate(second);

        return (secondDate?.getTime() || 0) - (firstDate?.getTime() || 0);
      })
      .slice(0, 8)
      .map((order) => {
        const costs =
          order.status === "COMPLETED"
            ? getCompletedOrderCost(order)
            : {
                actualProductionCost: 0,
              };

        return {
          id: order.id,
          number: order.number,
          productName: order.productName,
          status: order.status,
          date: toIsoDate(getProductionReportDate(order)),
          plannedQuantity: positiveNumber(order.plannedQuantity),
          producedQuantity:
            order.status === "COMPLETED"
              ? positiveNumber(order.producedQuantity)
              : 0,
          cost: costs.actualProductionCost,
          unit: order.unit,
        };
      }),
  };
};
