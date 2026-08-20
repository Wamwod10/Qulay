export const SETTINGS_SCHEMA_VERSION = 3;

export const TERMINOLOGY_DEFAULTS = {
  dashboard: "Bosh sahifa",
  sales: "Savdo",
  pos: "Savdo terminali",
  salesHistory: "Savdo ro'yxati",
  product: "Mahsulot",
  products: "Mahsulotlar",
  customer: "Mijoz",
  customers: "Mijozlar",
  supplier: "Yetkazib beruvchi",
  suppliers: "Yetkazib beruvchilar",
  warehouse: "Ombor",
  purchases: "Xaridlar",
  agent: "Agent",
  agents: "Agentlar",
  manufacturing: "Ishlab chiqarish",
  finance: "Moliya",
  employee: "Xodim",
  employees: "Xodimlar",
  reports: "Hisobotlar",
  settings: "Sozlamalar",
  debt: "Qarzdorlik",
  cost: "Tannarx",
  salePrice: "Sotuv narxi",
  defect: "Brak",
  waste: "Chiqindi",
};

export const MIN_TABLE_PAGE_SIZE = 10;
export const MAX_TABLE_PAGE_SIZE = 500;

export const DEFAULT_TABLE_STATE = {
  columnOrder: [],
  hiddenColumns: [],
  columnWidths: {},
  defaultSort: "",
  defaultPageSize: 10,
  rowDensity: "inherit",
};

export const DEFAULT_SETTINGS = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,

  appearance: {
    theme: "light",
    fontSize: "standard",
    fontScale: 1,
    bodyFontWeight: 400,
    headingFontWeight: 700,
    tableFontSize: 13,
    density: "normal",
    radiusScale: "standard",
    shadowStrength: "normal",
    sidebarDefault: "expanded",
    sidebarWidth: "normal",
    contentMaxWidth: "wide",
  },

  tables: {},

  modules: {
    defaultModule: "dashboard",
    items: {},
  },

  terminology: {},

  behavior: {
    confirmDelete: true,
    confirmCancel: true,
    confirmDangerous: true,
    autosaveForms: false,
    rememberFilters: true,
    rememberLastOpenedModule: true,
    openDetailMode: "same-page",
    allowCompletedRecordEditing: false,
  },

  formats: {
    language: "uz",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24h",
    moneyFormat: "space-symbol",
    currency: "UZS",
    numberPrecision: 2,
    quantityPrecision: 2,
  },

  defaults: {
    warehouseId: "",
    agentId: "",
    customerId: "",
    paymentMethod: "CASH",
    cashboxId: "cashbox-main",
    currency: "UZS",
    vatRate: 0,
    pageSize: 10,
    dashboardPeriod: "month",
    salesTab: "POS",
  },

  notifications: {
    lowStockWarning: true,
    outOfStockWarning: true,
    customerDebtWarning: true,
    supplierDebtWarning: true,
    latePurchaseWarning: true,
    productionShortageWarning: true,
    overdueCrmFollowUp: true,
    payrollDebtWarning: true,
    lateEmployeeWarning: true,
    sound: false,
  },

  pos: {
    defaultWarehouseId: "",
    defaultPaymentMethod: "CASH",
    defaultAgentId: "",
    defaultCustomerId: "",
    barcodeEnterAutoAdd: true,
    clearCartConfirmation: true,
    receiptWidth: "80mm",
    receiptHeader: "Universal savdo terminali",
    receiptFooter: "Xaridingiz uchun rahmat",
    showCustomerOnReceipt: true,
    showAgentOnReceipt: true,
    allowDiscount: true,
    maxDiscountPercent: 100,
    allowDebtSales: true,
    requireCustomerForDebt: true,
    autoPrintReceipt: false,
    afterSale: "clear-cart",
  },

  warehouse: {
    defaultWarehouseId: "",
    inventoryPolicy: "FEFO",
    lowStockWarning: true,
    lowStockThresholdMode: "product",
    negativeStockPolicy: "blocked",
    reservedStockVisible: true,
    stockMovementConfirmation: true,
    defaultStockView: "table",
  },

  manufacturing: {
    defaultProductionWarehouseId: "",
    qualityControlRequired: true,
    productionStagesRequired: true,
    blockCompletionIfQcFail: true,
    defaultBomStatus: "DRAFT",
    defectWarningThreshold: 5,
    wasteWarningThreshold: 5,
    autoReserveOnStartProduction: true,
  },

  crm: {
    defaultCustomerSegment: "REGULAR",
    defaultCreditLimit: 0,
    duplicatePhoneBehavior: "warning",
    overdueFollowUpWarning: true,
    defaultFollowUpDays: 7,
    customerScoreVisible: true,
    creditLimitCheckEnabled: true,
    inactiveCustomerSalesRule: "warning",
  },

  finance: {
    defaultCashboxId: "cashbox-main",
    defaultPaymentMethod: "CASH",
    debtWarningThreshold: 1000000,
    expenseConfirmation: true,
    supplierPaymentConfirmation: true,
    customerPaymentConfirmation: true,
    showZeroBalances: true,
    defaultFinancePeriod: "month",
  },

  hr: {
    defaultShiftId: "",
    lateThresholdMinutes: 15,
    defaultSalaryType: "MONTHLY",
    payrollPeriodBehavior: "current-month",
    payrollPaymentConfirmation: true,
    attendanceWarning: true,
    leaveWarning: true,
  },
};
