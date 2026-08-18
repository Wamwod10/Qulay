import { tTerm } from "../../../localization/i18n";

export const MODULE_ICON_OPTIONS = [
  "LayoutDashboard",
  "ShoppingCart",
  "Factory",
  "Warehouse",
  "PackagePlus",
  "Package",
  "Users",
  "Truck",
  "WalletCards",
  "UserRoundCog",
  "ChartNoAxesCombined",
  "Settings",
];

export const MODULE_ICON_LABELS = {
  LayoutDashboard: "Bosh sahifa belgisi",
  ShoppingCart: "Savdo savati",
  Factory: "Zavod",
  Warehouse: "Ombor",
  PackagePlus: "Xarid qutisi",
  Package: "Mahsulot qutisi",
  Users: "Foydalanuvchilar",
  Truck: "Yuk mashinasi",
  WalletCards: "Hamyon",
  UserRoundCog: "Xodim sozlamasi",
  ChartNoAxesCombined: "Hisobot grafigi",
  Settings: "Sozlama belgisi",
};

const terminologyKeyById = {
  dashboard: "dashboard",
  sales: "sales",
  manufacturing: "manufacturing",
  warehouse: "warehouse",
  purchases: "purchases",
  products: "products",
  customers: "customers",
  agents: "agents",
  suppliers: "suppliers",
  finance: "finance",
  employees: "employees",
  reports: "reports",
  settings: "settings",
};

export const getTerm = (terminology, key, language) =>
  tTerm(key, { terminology, language });

export const mergeNavigationSettings = ({
  items = [],
  modules = {},
  terminology = {},
  language = "uz",
}) => {
  const itemSettings = modules.items || {};

  return [...items]
    .map((item, index) => {
      const custom = itemSettings[item.id] || {};
      const termKey = terminologyKeyById[item.id];
      const fallbackLabel = termKey
        ? getTerm(terminology, termKey, language)
        : item.label;

      return {
        ...item,
        label: custom.label || fallbackLabel,
        icon: custom.icon || item.icon,
        hidden: Boolean(custom.hidden),
        order: Number.isFinite(Number(custom.order))
          ? Number(custom.order)
          : index,
      };
    })
    .sort((left, right) => left.order - right.order);
};
