export const OVERHEAD_TYPES = [
  {
    value: "LABOR",
    label: "Ishchi haqi",
  },
  {
    value: "ELECTRICITY",
    label: "Elektr",
  },
  {
    value: "GAS_ENERGY",
    label: "Gaz / energiya",
  },
  {
    value: "TRANSPORT",
    label: "Transport",
  },
  {
    value: "PACKAGING",
    label: "Qadoqlash xarajati",
  },
  {
    value: "EQUIPMENT",
    label: "Uskuna / amortizatsiya",
  },
  {
    value: "OTHER",
    label: "Boshqa xarajat",
  },
];

export const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

export const positiveNumber = (value) => Math.max(safeNumber(value), 0);

export const normalizeOverheadItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const type =
      OVERHEAD_TYPES.some((option) => option.value === item?.type)
        ? item.type
        : "OTHER";

    return {
      id: item?.id || `overhead-${Date.now()}-${index}`,
      type,
      name: item?.name || item?.description || "",
      amount: positiveNumber(item?.amount),
      note: item?.note || "",
    };
  });
};

export const createOverheadItem = () => ({
  id: `overhead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: "LABOR",
  name: "",
  amount: 0,
  note: "",
});

export const calculateOverheadCost = (items = []) =>
  normalizeOverheadItems(items).reduce(
    (total, item) => total + positiveNumber(item.amount),
    0,
  );

export const calculateActualProductionCost = ({
  actualMaterialCost = 0,
  overheadCost = 0,
}) => positiveNumber(actualMaterialCost) + positiveNumber(overheadCost);

export const calculateActualUnitCost = ({
  actualProductionCost = 0,
  producedQuantity = 0,
}) => {
  const produced = positiveNumber(producedQuantity);

  if (produced <= 0) {
    return 0;
  }

  return positiveNumber(actualProductionCost) / produced;
};
