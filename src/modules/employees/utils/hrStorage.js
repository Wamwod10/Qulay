import {
  addFinanceTransaction,
  createFinanceId,
  getDefaultCashboxId,
  getStoredFinanceTransactions,
  normalizeDate as normalizeFinanceDate,
  normalizePaymentMethod,
  roundMoney,
  toMoney,
} from "../../finance/utils/financeStorage";
import { tenantGet, tenantSet } from "../../auth/utils/tenantStorage";
import { apiRequest, getCachedApiResponse, unwrapList } from "../../../services/api/apiClient";

const EMPLOYEES_KEY = "hr_employees";
const ATTENDANCE_KEY = "hr_attendance";
const SHIFTS_KEY = "hr_shifts";
const ADVANCES_KEY = "hr_advances";
const BONUSES_KEY = "hr_bonuses";
const PENALTIES_KEY = "hr_penalties";
const LEAVES_KEY = "hr_leaves";
const PAYROLLS_KEY = "hr_payrolls";
const PAYROLL_PAYMENTS_KEY = "hr_payroll_payments";

export const SALARY_TYPES = ["MONTHLY", "DAILY", "HOURLY"];
export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"];
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "DAY_OFF", "LEAVE"];
export const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID", "OTHER"];
export const LEAVE_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"];
export const PAYROLL_STATUSES = ["DRAFT", "CALCULATED", "PARTIAL", "PAID"];
export const PENALTY_REASONS = ["Kechikish", "Kamomad", "Intizom", "Boshqa"];

export const DEFAULT_SHIFT_ID = "shift-standard";

export const DEFAULT_SHIFTS = [
  {
    id: DEFAULT_SHIFT_ID,
    name: "Kunduzgi smena",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    active: true,
  },
  {
    id: "shift-evening",
    name: "Kechki smena",
    startTime: "18:00",
    endTime: "00:00",
    breakMinutes: 30,
    active: true,
  },
];

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const createHrId = (prefix = "hr") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const monthIso = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return todayIso().slice(0, 7);
  }

  return date.toISOString().slice(0, 7);
};

export const safeMoney = (value) => roundMoney(value);

const signedMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
};

export const safeDate = (value, fallback = "") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString().slice(0, 10);
};

export const safeDateTime = (value) => {
  const date = new Date(value || Date.now());

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const readJson = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const parsed = tenantGet(key, null);

    if (!parsed) {
      tenantSet(key, fallback);
      return fallback;
    }

    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
  } catch (error) {
    console.error(`HR storage read error (${key}):`, error);

    return fallback;
  }
};

const writeJson = (key, value, { silent = false } = {}) => {
  if (!canUseStorage()) {
    return false;
  }

  tenantSet(key, value);

  if (!silent) {
    window.dispatchEvent(new Event("hr:changed"));
  }

  return true;
};

const normalizeEnum = (value, values, fallback) => {
  const normalized = String(value || "").toUpperCase();

  return values.includes(normalized) ? normalized : fallback;
};

const normalizeTime = (value, fallback = "09:00") => {
  const text = String(value || "").trim();

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
};

const timeToMinutes = (value) => {
  const [hour, minute] = normalizeTime(value, "00:00").split(":").map(Number);

  return hour * 60 + minute;
};

const dateInMonth = (date, month) => String(date || "").slice(0, 7) === month;

const isApprovedLeaveDay = (employeeId, date) =>
  getStoredLeaves().some((leave) => {
    if (leave.employeeId !== employeeId || leave.status !== "APPROVED") {
      return false;
    }

    return date >= leave.startDate && date <= leave.endDate;
  });

const getDaysInMonth = (month) => {
  const [year, monthNumber] = String(month || "").split("-").map(Number);

  if (!year || !monthNumber) {
    return 30;
  }

  return new Date(year, monthNumber, 0).getDate();
};

const getWorkingDaysInMonth = (month) => {
  const [year, monthNumber] = String(month || "").split("-").map(Number);

  if (!year || !monthNumber) {
    return 26;
  }

  let count = 0;
  const days = getDaysInMonth(month);

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, monthNumber - 1, day);

    if (date.getDay() !== 0) {
      count += 1;
    }
  }

  return count || 26;
};

export const normalizeEmployee = (employee = {}) => {
  const now = safeDateTime(employee.createdAt || Date.now());
  const salaryType = normalizeEnum(employee.salaryType, SALARY_TYPES, "MONTHLY");
  const baseSalary = safeMoney(employee.baseSalary ?? employee.salary ?? employee.monthlySalary);
  const hourlyRate = safeMoney(employee.hourlyRate);

  return {
    ...employee,
    id: String(employee.id || createHrId("emp")),
    fullName: String(employee.fullName || employee.name || "").trim(),
    phone: String(employee.phone || "").trim(),
    email: String(employee.email || "").trim(),
    position: String(employee.position || employee.jobTitle || "").trim(),
    department: String(employee.department || "Umumiy").trim(),
    branchId: employee.branchId || null,
    role: String(employee.role || "Xodim").trim(),
    salaryType,
    baseSalary,
    hourlyRate,
    status: normalizeEnum(employee.status, EMPLOYEE_STATUSES, "ACTIVE"),
    hireDate: safeDate(employee.hireDate || employee.startDate, todayIso()),
    birthDate: safeDate(employee.birthDate, ""),
    address: String(employee.address || "").trim(),
    note: String(employee.note || employee.notes || "").trim(),
    shiftId: employee.shiftId || DEFAULT_SHIFT_ID,
    createdAt: safeDateTime(employee.createdAt || now),
    updatedAt: safeDateTime(employee.updatedAt || employee.createdAt || now),
  };
};

export const getStoredEmployees = () => {
  const remoteEmployees = unwrapList(getCachedApiResponse("/employees"), ["employees"]);
  if (Array.isArray(remoteEmployees)) {
    writeJson(EMPLOYEES_KEY, remoteEmployees, { silent: true });
    return remoteEmployees.map(normalizeEmployee);
  }
  const normalized = readJson(EMPLOYEES_KEY, []).map(normalizeEmployee);

  writeJson(EMPLOYEES_KEY, normalized, { silent: true });

  return normalized;
};

export const saveEmployees = (employees) =>
  Array.isArray(employees)
    ? writeJson(EMPLOYEES_KEY, employees.map(normalizeEmployee))
    : false;

export const upsertEmployee = async (payload) => {
  const remoteEmployee = await apiRequest(payload.id ? `/employees/${payload.id}` : "/employees", {
    method: payload.id ? "PATCH" : "POST",
    body: payload,
  });
  if (remoteEmployee?.id) {
    const employees = getStoredEmployees();
    saveEmployees([remoteEmployee, ...employees.filter((employee) => employee.id !== remoteEmployee.id)]);
    return normalizeEmployee(remoteEmployee);
  }
  const employees = getStoredEmployees();
  const now = new Date().toISOString();
  const normalized = normalizeEmployee({
    ...payload,
    id: payload.id || createHrId("emp"),
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });

  if (!normalized.fullName) {
    throw new Error("F.I.Sh. majburiy.");
  }

  if (!normalized.phone) {
    throw new Error("Telefon majburiy.");
  }

  const exists = employees.some((employee) => employee.id === normalized.id);
  const next = exists
    ? employees.map((employee) => (employee.id === normalized.id ? normalized : employee))
    : [normalized, ...employees];

  saveEmployees(next);

  return normalized;
};

export const hasEmployeeHistory = (employeeId) =>
  [
    getStoredAttendance(),
    getStoredAdvances(),
    getStoredBonuses(),
    getStoredPenalties(),
    getStoredLeaves(),
    getStoredPayrolls(),
    getStoredPayrollPayments(),
  ].some((items) => items.some((item) => item.employeeId === employeeId));

export const deleteEmployee = async (employeeId) => {
  if (hasEmployeeHistory(employeeId)) {
    throw new Error("Tarix mavjud. Xodimni o'chirish o'rniga inactive qiling.");
  }

  await apiRequest(`/employees/${employeeId}`, {
    method: "DELETE",
  });

  saveEmployees(getStoredEmployees().filter((employee) => employee.id !== employeeId));
};

export const deactivateEmployee = async (employeeId) => {
  const employee = getStoredEmployees().find((item) => item.id === employeeId);

  if (!employee) {
    throw new Error("Xodim topilmadi.");
  }

  return await upsertEmployee({ ...employee, status: "INACTIVE" });
};

export const normalizeShift = (shift = {}) => ({
  id: String(shift.id || createHrId("shift")),
  name: String(shift.name || "Smena").trim(),
  startTime: normalizeTime(shift.startTime, "09:00"),
  endTime: normalizeTime(shift.endTime, "18:00"),
  breakMinutes: safeMoney(shift.breakMinutes),
  active: shift.active !== false,
});

export const getStoredShifts = () => {
  const stored = readJson(SHIFTS_KEY, DEFAULT_SHIFTS);
  const normalized = (Array.isArray(stored) ? stored : DEFAULT_SHIFTS).map(normalizeShift);

  if (!normalized.some((shift) => shift.id === DEFAULT_SHIFT_ID)) {
    normalized.unshift(DEFAULT_SHIFTS[0]);
  }

  writeJson(SHIFTS_KEY, normalized, { silent: true });

  return normalized;
};

export const saveShifts = (shifts) =>
  Array.isArray(shifts) ? writeJson(SHIFTS_KEY, shifts.map(normalizeShift)) : false;

export const upsertShift = (payload) => {
  const shifts = getStoredShifts();
  const normalized = normalizeShift(payload);
  const exists = shifts.some((shift) => shift.id === normalized.id);

  saveShifts(exists ? shifts.map((shift) => (shift.id === normalized.id ? normalized : shift)) : [normalized, ...shifts]);

  return normalized;
};

export const getShiftMinutes = (shift) => {
  const start = timeToMinutes(shift?.startTime || "09:00");
  let end = timeToMinutes(shift?.endTime || "18:00");

  if (end <= start) {
    end += 24 * 60;
  }

  return {
    start,
    end,
    duration: Math.max(end - start - safeMoney(shift?.breakMinutes), 0),
    overnight: end > 24 * 60,
  };
};

export const normalizeAttendance = (record = {}) => {
  const employeeId = record.employeeId || null;
  const date = safeDate(record.date, todayIso());
  const employee = getStoredEmployees().find((item) => item.id === employeeId);
  const shift = getStoredShifts().find((item) => item.id === (record.shiftId || employee?.shiftId));
  const checkIn = record.checkIn ? normalizeTime(record.checkIn, "") : "";
  const checkOut = record.checkOut ? normalizeTime(record.checkOut, "") : "";
  const status = isApprovedLeaveDay(employeeId, date)
    ? "LEAVE"
    : normalizeEnum(record.status, ATTENDANCE_STATUSES, checkIn ? "PRESENT" : "ABSENT");
  let workedMinutes = safeMoney(record.workedMinutes);
  let lateMinutes = safeMoney(record.lateMinutes);

  if (checkIn && checkOut) {
    const inMinutes = timeToMinutes(checkIn);
    let outMinutes = timeToMinutes(checkOut);

    if (shift && getShiftMinutes(shift).overnight && outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    if (outMinutes < inMinutes) {
      throw new Error("Chiqish vaqti kirish vaqtidan oldin bo'lmasin.");
    }

    workedMinutes = Math.max(outMinutes - inMinutes - safeMoney(shift?.breakMinutes), 0);
  }

  if (checkIn && shift) {
    lateMinutes = Math.max(timeToMinutes(checkIn) - timeToMinutes(shift.startTime), 0);
  }

  return {
    id: String(record.id || createHrId("att")),
    employeeId,
    date,
    checkIn,
    checkOut,
    status: lateMinutes > 0 && status === "PRESENT" ? "LATE" : status,
    lateMinutes,
    workedMinutes,
    note: String(record.note || "").trim(),
    createdAt: safeDateTime(record.createdAt || Date.now()),
    updatedAt: safeDateTime(record.updatedAt || record.createdAt || Date.now()),
  };
};

export const getStoredAttendance = () => {
  const normalized = readJson(ATTENDANCE_KEY, []).map(normalizeAttendance);
  const map = new Map();

  normalized.forEach((record) => {
    const key = `${record.employeeId}-${record.date}`;

    if (!map.has(key)) {
      map.set(key, record);
    }
  });

  const unique = [...map.values()];

  writeJson(ATTENDANCE_KEY, unique, { silent: true });

  return unique;
};

export const saveAttendance = (records) =>
  Array.isArray(records)
    ? writeJson(ATTENDANCE_KEY, records.map(normalizeAttendance))
    : false;

export const upsertAttendance = (payload) => {
  const records = getStoredAttendance();
  const normalized = normalizeAttendance(payload);

  if (!normalized.employeeId) {
    throw new Error("Davomat uchun xodim tanlang.");
  }

  const duplicate = records.find(
    (record) =>
      record.employeeId === normalized.employeeId &&
      record.date === normalized.date &&
      record.id !== normalized.id,
  );

  if (duplicate) {
    throw new Error("Bu xodim uchun shu kunda davomat allaqachon bor.");
  }

  const exists = records.some((record) => record.id === normalized.id);

  saveAttendance(
    exists
      ? records.map((record) => (record.id === normalized.id ? normalized : record))
      : [normalized, ...records],
  );

  return normalized;
};

const normalizeAmountRecord = (record = {}, prefix, fallbackReason = "") => ({
  id: String(record.id || createHrId(prefix)),
  employeeId: record.employeeId || null,
  amount: safeMoney(record.amount),
  reason: String(record.reason || fallbackReason).trim(),
  date: safeDate(record.date, todayIso()),
  note: String(record.note || "").trim(),
  createdAt: safeDateTime(record.createdAt || Date.now()),
});

export const getStoredAdvances = () =>
  readJson(ADVANCES_KEY, []).map((record) => ({
    ...normalizeAmountRecord(record, "adv"),
    status: record.status || "POSTED",
    financeTransactionId: record.financeTransactionId || null,
  }));

export const saveAdvances = (records) => writeJson(ADVANCES_KEY, records);

export const addAdvance = async ({ paymentMethod = "CASH", cashboxId, ...payload }) => {
  const record = {
    ...normalizeAmountRecord(payload, "adv", "Avans"),
    status: payload.status || "POSTED",
  };

  if (record.amount <= 0) {
    throw new Error("Avans summasi 0 dan katta bo'lishi kerak.");
  }

  const transactions = getStoredFinanceTransactions();
  const existing = transactions.find(
    (transaction) =>
      transaction.sourceType === "EMPLOYEE_ADVANCE" && transaction.sourceId === record.id,
  );
  const method = normalizePaymentMethod(paymentMethod);
  const financeTransaction =
    existing ||
    await addFinanceTransaction({
      id: createFinanceId("emp-adv"),
      type: "OUT",
      category: "Oylik",
      sourceType: "EMPLOYEE_ADVANCE",
      sourceId: record.id,
      employeeId: record.employeeId,
      amount: record.amount,
      paymentMethod: method,
      cashboxId: cashboxId || getDefaultCashboxId(method),
      date: normalizeFinanceDate(record.date),
      note: record.note || "Xodim avansi",
    });

  const nextRecord = { ...record, financeTransactionId: financeTransaction.id };
  const records = getStoredAdvances();

  saveAdvances([nextRecord, ...records.filter((item) => item.id !== nextRecord.id)]);

  return nextRecord;
};

export const getStoredBonuses = () =>
  readJson(BONUSES_KEY, []).map((record) => normalizeAmountRecord(record, "bonus", "Bonus"));

export const saveBonuses = (records) => writeJson(BONUSES_KEY, records);

export const addBonus = (payload) => {
  const record = normalizeAmountRecord(payload, "bonus", payload.reason || "Bonus");

  if (record.amount <= 0) {
    throw new Error("Bonus summasi 0 dan katta bo'lishi kerak.");
  }

  saveBonuses([record, ...getStoredBonuses().filter((item) => item.id !== record.id)]);

  return record;
};

export const getStoredPenalties = () =>
  readJson(PENALTIES_KEY, []).map((record) => normalizeAmountRecord(record, "penalty", "Boshqa"));

export const savePenalties = (records) => writeJson(PENALTIES_KEY, records);

export const addPenalty = (payload) => {
  const record = normalizeAmountRecord(payload, "penalty", payload.reason || "Boshqa");

  if (record.amount <= 0) {
    throw new Error("Jarima summasi 0 dan katta bo'lishi kerak.");
  }

  savePenalties([record, ...getStoredPenalties().filter((item) => item.id !== record.id)]);

  return record;
};

export const normalizeLeave = (record = {}) => {
  const startDate = safeDate(record.startDate, todayIso());
  const endDate = safeDate(record.endDate, startDate);

  return {
    id: String(record.id || createHrId("leave")),
    employeeId: record.employeeId || null,
    type: normalizeEnum(record.type, LEAVE_TYPES, "ANNUAL"),
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    status: normalizeEnum(record.status, LEAVE_STATUSES, "REQUESTED"),
    paid: Boolean(record.paid),
    note: String(record.note || "").trim(),
    createdAt: safeDateTime(record.createdAt || Date.now()),
  };
};

export const getStoredLeaves = () => readJson(LEAVES_KEY, []).map(normalizeLeave);

export const saveLeaves = (records) => writeJson(LEAVES_KEY, records.map(normalizeLeave));

export const upsertLeave = (payload) => {
  const record = normalizeLeave(payload);
  const records = getStoredLeaves();

  if (!record.employeeId) {
    throw new Error("Tatil uchun xodim tanlang.");
  }

  saveLeaves([record, ...records.filter((item) => item.id !== record.id)]);

  return record;
};

export const getStoredPayrolls = () =>
  (unwrapList(getCachedApiResponse("/employees/payroll"), ["payrolls"]) || readJson(PAYROLLS_KEY, [])).map((record) => ({
    id: String(record.id || createHrId("payroll")),
    employeeId: record.employeeId || null,
    month: String(record.month || monthIso()),
    baseAmount: safeMoney(record.baseAmount),
    attendanceAdjustment: signedMoney(record.attendanceAdjustment || 0),
    bonuses: safeMoney(record.bonuses),
    advances: safeMoney(record.advances),
    penalties: safeMoney(record.penalties),
    grossAmount: safeMoney(record.grossAmount),
    netAmount: safeMoney(record.netAmount),
    paidAmount: safeMoney(record.paidAmount),
    debtAmount: safeMoney(record.debtAmount),
    status: normalizeEnum(record.status, PAYROLL_STATUSES, "DRAFT"),
    paidAt: record.paidAt || null,
    createdAt: safeDateTime(record.createdAt || Date.now()),
    updatedAt: safeDateTime(record.updatedAt || record.createdAt || Date.now()),
  }));

export const savePayrolls = (records) => writeJson(PAYROLLS_KEY, records);

export const getStoredPayrollPayments = () =>
  readJson(PAYROLL_PAYMENTS_KEY, []).map((record) => ({
    id: String(record.id || createHrId("salary-pay")),
    employeeId: record.employeeId || null,
    payrollId: record.payrollId || null,
    amount: safeMoney(record.amount),
    method: normalizePaymentMethod(record.method || record.paymentMethod || "CASH"),
    date: safeDate(record.date, todayIso()),
    cashboxId: record.cashboxId || getDefaultCashboxId(record.method || record.paymentMethod || "CASH"),
    note: String(record.note || "").trim(),
    financeTransactionId: record.financeTransactionId || null,
    createdAt: safeDateTime(record.createdAt || Date.now()),
  }));

export const savePayrollPayments = (records) => writeJson(PAYROLL_PAYMENTS_KEY, records);

export const getEmployeeAttendance = (employeeId, period = {}) =>
  getStoredAttendance().filter((record) => {
    if (record.employeeId !== employeeId) {
      return false;
    }

    if (period.month && !dateInMonth(record.date, period.month)) {
      return false;
    }

    if (period.from && record.date < period.from) {
      return false;
    }

    if (period.to && record.date > period.to) {
      return false;
    }

    return true;
  });

export const getEmployeeWorkedDays = (employeeId, month) =>
  getEmployeeAttendance(employeeId, { month }).filter((record) =>
    ["PRESENT", "LATE"].includes(record.status),
  ).length;

export const getEmployeeWorkedHours = (employeeId, month) =>
  roundMoney(
    getEmployeeAttendance(employeeId, { month }).reduce(
      (total, record) => total + safeMoney(record.workedMinutes) / 60,
      0,
    ),
  );

export const getEmployeeBonuses = (employeeId, month) =>
  getStoredBonuses().filter(
    (record) => record.employeeId === employeeId && dateInMonth(record.date, month),
  );

export const getEmployeeAdvances = (employeeId, month) =>
  getStoredAdvances().filter(
    (record) => record.employeeId === employeeId && dateInMonth(record.date, month),
  );

export const getEmployeePenalties = (employeeId, month) =>
  getStoredPenalties().filter(
    (record) => record.employeeId === employeeId && dateInMonth(record.date, month),
  );

export const calculateEmployeePayroll = (employeeId, month = monthIso()) => {
  const employee = getStoredEmployees().find((item) => item.id === employeeId);

  if (!employee) {
    throw new Error("Xodim topilmadi.");
  }

  const attendance = getEmployeeAttendance(employeeId, { month });
  const workedDays = getEmployeeWorkedDays(employeeId, month);
  const workedHours = getEmployeeWorkedHours(employeeId, month);
  const absentDays = attendance.filter((record) => record.status === "ABSENT").length;
  const workingDays = getWorkingDaysInMonth(month);
  let baseAmount = employee.baseSalary;
  let attendanceAdjustment = 0;

  if (employee.salaryType === "DAILY") {
    baseAmount = roundMoney(workedDays * employee.baseSalary);
  } else if (employee.salaryType === "HOURLY") {
    baseAmount = roundMoney(workedHours * employee.hourlyRate);
  } else if (absentDays > 0) {
    attendanceAdjustment = -roundMoney((employee.baseSalary / workingDays) * absentDays);
  }

  const bonuses = roundMoney(
    getEmployeeBonuses(employeeId, month).reduce((total, record) => total + toMoney(record.amount), 0),
  );
  const advances = roundMoney(
    getEmployeeAdvances(employeeId, month).reduce((total, record) => total + toMoney(record.amount), 0),
  );
  const penalties = roundMoney(
    getEmployeePenalties(employeeId, month).reduce((total, record) => total + toMoney(record.amount), 0),
  );
  const grossAmount = roundMoney(Math.max(baseAmount + attendanceAdjustment, 0) + bonuses);
  const netAmount = roundMoney(Math.max(grossAmount - advances - penalties, 0));
  const existing = getStoredPayrolls().find(
    (record) => record.employeeId === employeeId && record.month === month,
  );
  const paidAmount = safeMoney(existing?.paidAmount);
  const debtAmount = roundMoney(Math.max(netAmount - paidAmount, 0));
  const status =
    paidAmount >= netAmount && netAmount > 0
      ? "PAID"
      : paidAmount > 0
        ? "PARTIAL"
        : "CALCULATED";

  return {
    id: existing?.id || createHrId("payroll"),
    employeeId,
    month,
    baseAmount: roundMoney(baseAmount),
    attendanceAdjustment,
    bonuses,
    advances,
    penalties,
    grossAmount,
    netAmount,
    paidAmount,
    debtAmount,
    status,
    paidAt: status === "PAID" ? existing?.paidAt || new Date().toISOString() : null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const saveCalculatedPayroll = async (employeeId, month = monthIso()) => {
  const payroll = calculateEmployeePayroll(employeeId, month);
  const remotePayroll = await apiRequest("/employees/payroll", {
    method: "POST",
    body: {
      ...payroll,
      period: payroll.month || month,
      grossAmount: payroll.grossAmount || payroll.baseSalary,
    },
  });
  if (remotePayroll?.id) {
    const records = getStoredPayrolls();
    savePayrolls([remotePayroll, ...records.filter((record) => record.id !== remotePayroll.id)]);
    return remotePayroll;
  }
  const records = getStoredPayrolls();

  savePayrolls([payroll, ...records.filter((record) => record.id !== payroll.id)]);

  return payroll;
};

export const payPayroll = async ({ payrollId, amount, method = "CASH", cashboxId, date, note = "" }) => {
  const remotePayroll = await apiRequest(`/employees/payroll/${payrollId}/pay`, {
    method: "POST",
    idempotencyKey: `payroll-payment:${payrollId}:${amount}`,
    body: { amount, method, cashboxId, date, note, idempotencyKey: `payroll-payment:${payrollId}:${amount}` },
  });
  if (remotePayroll?.id) {
    const payrolls = getStoredPayrolls();
    savePayrolls(payrolls.map((record) => (record.id === remotePayroll.id ? remotePayroll : record)));
    window.dispatchEvent(new Event("finance:changed"));
    return { payroll: remotePayroll, payment: null };
  }
  const payrolls = getStoredPayrolls();
  const payroll = payrolls.find((record) => record.id === payrollId);

  if (!payroll) {
    throw new Error("Ish haqi topilmadi.");
  }

  const safeAmount = safeMoney(amount);

  if (safeAmount <= 0) {
    throw new Error("To'lov summasi 0 dan katta bo'lishi kerak.");
  }

  if (safeAmount > payroll.debtAmount) {
    throw new Error("Ish haqi qarzidan ortiq to'lov mumkin emas.");
  }

  const payment = {
    id: createHrId("salary-pay"),
    employeeId: payroll.employeeId,
    payrollId: payroll.id,
    amount: safeAmount,
    method: normalizePaymentMethod(method),
    date: safeDate(date, todayIso()),
    cashboxId: cashboxId || getDefaultCashboxId(method),
    note,
    createdAt: new Date().toISOString(),
  };
  const existingTransaction = getStoredFinanceTransactions().find(
    (transaction) =>
      transaction.sourceType === "PAYROLL_PAYMENT" && transaction.sourceId === payment.id,
  );
  const financeTransaction =
    existingTransaction ||
    await addFinanceTransaction({
      id: createFinanceId("salary-pay"),
      type: "OUT",
      category: "Oylik",
      sourceType: "PAYROLL_PAYMENT",
      sourceId: payment.id,
      employeeId: payroll.employeeId,
      amount: payment.amount,
      paymentMethod: payment.method,
      cashboxId: payment.cashboxId,
      date: normalizeFinanceDate(payment.date),
      note: note || `Ish haqi ${payroll.month}`,
    });
  const nextPayment = { ...payment, financeTransactionId: financeTransaction.id };
  const paidAmount = roundMoney(payroll.paidAmount + payment.amount);
  const debtAmount = roundMoney(Math.max(payroll.netAmount - paidAmount, 0));
  const status = debtAmount <= 0 ? "PAID" : "PARTIAL";
  const updatedPayroll = {
    ...payroll,
    paidAmount,
    debtAmount,
    status,
    paidAt: status === "PAID" ? new Date().toISOString() : payroll.paidAt,
    updatedAt: new Date().toISOString(),
  };

  savePayrollPayments([nextPayment, ...getStoredPayrollPayments()]);
  savePayrolls(payrolls.map((record) => (record.id === payroll.id ? updatedPayroll : record)));

  return { payroll: updatedPayroll, payment: nextPayment };
};

export const getEmployeeSalaryDebt = (employeeId) =>
  roundMoney(
    getStoredPayrolls()
      .filter((record) => record.employeeId === employeeId)
      .reduce((total, record) => total + toMoney(record.debtAmount), 0),
  );

export const getHrSummary = () => {
  const employees = getStoredEmployees();
  const attendance = getStoredAttendance();
  const today = todayIso();
  const currentMonth = monthIso();
  const payrolls = getStoredPayrolls().filter((record) => record.month === currentMonth);
  const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE");
  const todayAttendance = attendance.filter((record) => record.date === today);
  const paidSalary = payrolls.reduce((total, record) => total + toMoney(record.paidAmount), 0);
  const salaryDebt = getStoredPayrolls().reduce((total, record) => total + toMoney(record.debtAmount), 0);
  const bonuses = getStoredBonuses().filter((record) => dateInMonth(record.date, currentMonth));
  const advances = getStoredAdvances().filter((record) => dateInMonth(record.date, currentMonth));
  const penalties = getStoredPenalties().filter((record) => dateInMonth(record.date, currentMonth));
  const present = todayAttendance.filter((record) => ["PRESENT", "LATE"].includes(record.status)).length;
  const lateCount = todayAttendance.filter((record) => record.status === "LATE").length;
  const absentToday = activeEmployees.filter(
    (employee) =>
      !todayAttendance.some((record) => record.employeeId === employee.id) ||
      todayAttendance.some((record) => record.employeeId === employee.id && record.status === "ABSENT"),
  );
  const upcomingLeave = getStoredLeaves().filter(
    (leave) => leave.status === "APPROVED" && leave.startDate >= today,
  );

  return {
    employeeCount: employees.length,
    activeCount: activeEmployees.length,
    todayPresent: present,
    salaryFund: roundMoney(activeEmployees.reduce((total, employee) => total + toMoney(employee.baseSalary), 0)),
    lateCount,
    onLeaveCount: employees.filter((employee) => employee.status === "ON_LEAVE").length,
    payrollTotal: roundMoney(payrolls.reduce((total, record) => total + toMoney(record.netAmount), 0)),
    paidSalary: roundMoney(paidSalary),
    salaryDebt: roundMoney(salaryDebt),
    advances: roundMoney(advances.reduce((total, record) => total + toMoney(record.amount), 0)),
    bonuses: roundMoney(bonuses.reduce((total, record) => total + toMoney(record.amount), 0)),
    penalties: roundMoney(penalties.reduce((total, record) => total + toMoney(record.amount), 0)),
    attendanceRate: activeEmployees.length ? roundMoney((present / activeEmployees.length) * 100) : 0,
    absentToday,
    lateEmployees: todayAttendance.filter((record) => record.status === "LATE"),
    unpaidPayrolls: getStoredPayrolls().filter((record) => record.debtAmount > 0),
    upcomingLeave,
  };
};

export const buildHrReport = (month = monthIso()) => {
  const employees = getStoredEmployees();
  const payrolls = getStoredPayrolls().filter((record) => record.month === month);
  const attendance = getStoredAttendance().filter((record) => dateInMonth(record.date, month));
  const bonuses = getStoredBonuses().filter((record) => dateInMonth(record.date, month));
  const penalties = getStoredPenalties().filter((record) => dateInMonth(record.date, month));
  const advances = getStoredAdvances().filter((record) => dateInMonth(record.date, month));
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentMap = new Map();

  payrolls.forEach((payroll) => {
    const employee = employeeMap.get(payroll.employeeId);
    const key = employee?.department || "Umumiy";
    const current = departmentMap.get(key) || {
      id: key,
      name: key,
      employees: 0,
      payroll: 0,
      debt: 0,
    };

    current.employees += 1;
    current.payroll = roundMoney(current.payroll + payroll.netAmount);
    current.debt = roundMoney(current.debt + payroll.debtAmount);
    departmentMap.set(key, current);
  });

  return {
    summary: getHrSummary(),
    payrollByMonth: payrolls.map((payroll) => ({
      ...payroll,
      employeeName: employeeMap.get(payroll.employeeId)?.fullName || "-",
    })),
    attendance,
    lateEmployees: attendance
      .filter((record) => record.status === "LATE")
      .map((record) => ({
        ...record,
        employeeName: employeeMap.get(record.employeeId)?.fullName || "-",
      })),
    salaryDebt: payrolls
      .filter((record) => record.debtAmount > 0)
      .map((record) => ({
        ...record,
        employeeName: employeeMap.get(record.employeeId)?.fullName || "-",
      })),
    bonusPenalty: [...bonuses, ...penalties.map((record) => ({ ...record, type: "PENALTY" }))],
    departmentPayroll: [...departmentMap.values()].sort((a, b) => b.payroll - a.payroll),
    advances,
  };
};

export const getEmployeePaymentHistory = (employeeId) =>
  getStoredPayrollPayments()
    .filter((payment) => payment.employeeId === employeeId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
