import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileMinus,
  Gift,
  HandCoins,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  LiveIcon,
  Modal,
  Select,
  Table,
  Textarea,
} from "../../../../shared/ui";

import {
  ATTENDANCE_STATUSES,
  DEFAULT_SHIFT_ID,
  EMPLOYEE_STATUSES,
  LEAVE_STATUSES,
  LEAVE_TYPES,
  PAYROLL_STATUSES,
  PENALTY_REASONS,
  SALARY_TYPES,
  addAdvance,
  addBonus,
  addPenalty,
  buildHrReport,
  calculateEmployeePayroll,
  createHrId,
  deactivateEmployee,
  deleteEmployee,
  getEmployeeAdvances,
  getEmployeeAttendance,
  getEmployeeBonuses,
  getEmployeePaymentHistory,
  getEmployeePenalties,
  getEmployeeSalaryDebt,
  getHrSummary,
  getStoredAdvances,
  getStoredAttendance,
  getStoredBonuses,
  getStoredEmployees,
  getStoredLeaves,
  getStoredPayrollPayments,
  getStoredPayrolls,
  getStoredShifts,
  hasEmployeeHistory,
  monthIso,
  payPayroll,
  safeMoney,
  saveCalculatedPayroll,
  todayIso,
  upsertAttendance,
  upsertEmployee,
  upsertLeave,
  upsertShift,
} from "../../utils/hrStorage";

import { getStoredCashboxes, PAYMENT_METHODS } from "../../../finance/utils/financeStorage";
import { formatFinanceMoney, getPaymentMethodLabel } from "../../../finance/utils/financeSelectors";
import useConfiguredColumns from "../../../settings/hooks/useConfiguredColumns";
import {
  useDefaultSettings,
  useHrSettings,
} from "../../../settings/selectors/settingsSelectors";

import "./HrWorkspace.scss";

const salaryTypeLabels = {
  MONTHLY: "Oylik",
  DAILY: "Kunlik",
  HOURLY: "Soatlik",
};

const statusLabels = {
  ACTIVE: "Faol",
  INACTIVE: "Faol emas",
  ON_LEAVE: "Ta'tilda",
  PRESENT: "Ishda",
  ABSENT: "Kelmagan",
  LATE: "Kechikkan",
  DAY_OFF: "Dam",
  LEAVE: "Ta'til",
  REQUESTED: "So'rov",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad",
  COMPLETED: "Yakunlangan",
  DRAFT: "Qoralama",
  CALCULATED: "Hisoblangan",
  PARTIAL: "Qisman",
  PAID: "To'langan",
};

const leaveTypeLabels = {
  ANNUAL: "Yillik ta'til",
  SICK: "Kasallik ta'tili",
  UNPAID: "To'lanmaydigan ta'til",
  OTHER: "Boshqa",
};

const roleOptions = ["", "Admin", "Kassir", "Sotuvchi", "Omborchi", "Buxgalter", "Xodim"].map(
  (value) => ({ value, label: value || "Barcha rollar" }),
);

const paymentMethodOptions = PAYMENT_METHODS.map((value) => ({
  value,
  label: getPaymentMethodLabel(value),
}));

const money = (value) => `${formatFinanceMoney(value)} so'm`;

const optionize = (items, emptyLabel) => [
  { value: "", label: emptyLabel },
  ...items.filter(Boolean).map((value) => ({ value, label: value })),
];

const getBadgeVariant = (status) => {
  if (["ACTIVE", "PRESENT", "APPROVED", "PAID"].includes(status)) {
    return "success";
  }

  if (["LATE", "REQUESTED", "PARTIAL", "CALCULATED"].includes(status)) {
    return "warning";
  }

  if (["ABSENT", "INACTIVE", "REJECTED"].includes(status)) {
    return "danger";
  }

  return "neutral";
};

const StatusIcon = ({ status, size = 14 }) => {
  if (status === "PRESENT" || status === "PAID") {
    return <LiveIcon icon={CheckCircle2} motion="success-pop" once size={size} />;
  }

  if (status === "LATE") {
    return <LiveIcon icon={Clock3} motion="warning-glow" size={size} />;
  }

  if (status === "ABSENT") {
    return <LiveIcon icon={AlertTriangle} motion="danger" size={size} />;
  }

  if (status === "REQUESTED" || status === "PARTIAL" || status === "CALCULATED") {
    return <LiveIcon icon={Clock3} motion="pulse-soft" size={size} />;
  }

  return null;
};

const StatusBadge = ({ status }) => (
  <Badge variant={getBadgeVariant(status)}>
    <StatusIcon status={status} />
    {statusLabels[status] || status || "-"}
  </Badge>
);

const HrWorkspace = ({ view = "overview", mode = "list" }) => {
  const navigate = useNavigate();
  const params = useParams();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const sync = () => setVersion((current) => current + 1);

    window.addEventListener("hr:changed", sync);
    window.addEventListener("finance:changed", sync);

    return () => {
      window.removeEventListener("hr:changed", sync);
      window.removeEventListener("finance:changed", sync);
    };
  }, []);

  const data = useMemo(
    () => ({
      employees: getStoredEmployees(),
      attendance: getStoredAttendance(),
      shifts: getStoredShifts(),
      advances: getStoredAdvances(),
      bonuses: getStoredBonuses(),
      leaves: getStoredLeaves(),
      payrolls: getStoredPayrolls(),
      payrollPayments: getStoredPayrollPayments(),
      cashboxes: getStoredCashboxes(),
      summary: getHrSummary(),
    }),
    [version],
  );

  const refresh = () => setVersion((current) => current + 1);
  const employee = data.employees.find((item) => item.id === params.employeeId);

  const content = () => {
    if (view === "overview") {
      return <HrDashboard data={data} />;
    }

    if (view === "employee-form") {
      return (
        <EmployeeFormPanel
          employee={mode === "edit" ? employee : null}
          shifts={data.shifts}
          onCancel={() => navigate(mode === "edit" && employee ? `/hr/employees/${employee.id}` : "/hr/employees")}
          onSaved={(saved) => navigate(`/hr/employees/${saved.id}`)}
        />
      );
    }

    if (view === "employee-details") {
      return employee ? (
        <EmployeeDetails employee={employee} data={data} refresh={refresh} />
      ) : (
        <Card padding="lg">Xodim topilmadi.</Card>
      );
    }

    if (view === "attendance") {
      return <AttendanceManager data={data} refresh={refresh} />;
    }

    if (view === "shifts") {
      return <ShiftManager data={data} refresh={refresh} />;
    }

    if (view === "payroll") {
      return <PayrollManager data={data} refresh={refresh} />;
    }

    if (view === "leave") {
      return <LeaveManager data={data} refresh={refresh} />;
    }

    return <EmployeeList data={data} refresh={refresh} />;
  };

  return (
    <PageContainer title="HR / Xodimlar" description="Xodim, davomat, smena, ish haqi va moliya oqimi.">
      <div className="hr-workspace">
        <nav className="hr-workspace__nav" aria-label="Xodimlar bo‘limi">
          <NavLink to="/hr" end>
            Boshqaruv paneli
          </NavLink>
          <NavLink to="/hr/employees">Xodimlar</NavLink>
          <NavLink to="/hr/attendance">Davomat</NavLink>
          <NavLink to="/hr/shifts">Smenalar</NavLink>
          <NavLink to="/hr/payroll">Oylik hisob-kitobi</NavLink>
          <NavLink to="/hr/leave">Ta'til</NavLink>
        </nav>

        {content()}
      </div>
    </PageContainer>
  );
};

const HrDashboard = ({ data }) => {
  const { summary } = data;
  const birthdays = data.employees.filter((employee) => {
    const birthDate = employee.birthDate;

    return birthDate && birthDate.slice(5) >= todayIso().slice(5);
  });

  return (
    <>
      <KpiGrid
        items={[
          { label: "Jami xodim", value: summary.employeeCount, icon: Users },
          { label: "Faol xodim", value: summary.activeCount, icon: UserCheck, variant: "success" },
          { label: "Bugun ishda", value: summary.todayPresent, icon: CheckCircle2, variant: "success" },
          { label: "Oylik fondi", value: money(summary.salaryFund), icon: Banknote },
          { label: "Kechikkanlar", value: summary.lateCount, icon: Clock3, variant: "warning" },
          { label: "Tatildagilar", value: summary.onLeaveCount, icon: CalendarDays },
        ]}
      />

      <div className="hr-workspace__dashboard-grid">
        <SignalPanel
          title="Bugun kelmaganlar"
          rows={summary.absentToday.map((employee) => ({
            id: employee.id,
            name: employee.fullName,
            value: employee.department,
          }))}
        />
        <SignalPanel
          title="Kechikkanlar"
          rows={summary.lateEmployees.map((record) => ({
            id: record.id,
            name: data.employees.find((employee) => employee.id === record.employeeId)?.fullName || "-",
            value: `${record.lateMinutes} min`,
          }))}
        />
        <SignalPanel
          title="Tolanmagan oylik"
          rows={summary.unpaidPayrolls.map((payroll) => ({
            id: payroll.id,
            name: data.employees.find((employee) => employee.id === payroll.employeeId)?.fullName || "-",
            value: money(payroll.debtAmount),
          }))}
        />
        <SignalPanel
          title="Yaqinlashayotgan ta'tillar"
          rows={summary.upcomingLeave.map((leave) => ({
            id: leave.id,
            name: data.employees.find((employee) => employee.id === leave.employeeId)?.fullName || "-",
            value: `${leave.startDate} - ${leave.endDate}`,
          }))}
        />
        <SignalPanel
          title="Tug'ilgan kunlar"
          rows={birthdays.slice(0, 5).map((employee) => ({
            id: employee.id,
            name: employee.fullName,
            value: employee.birthDate,
          }))}
        />
      </div>
    </>
  );
};

const EmployeeList = ({ data, refresh }) => {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
    department: "",
    branchId: "",
    salaryType: "",
  });
  const todayAttendance = data.attendance.filter((record) => record.date === todayIso());
  const departments = [...new Set(data.employees.map((employee) => employee.department))];
  const branches = [...new Set(data.employees.map((employee) => employee.branchId).filter(Boolean))];

  const rows = data.employees.filter((employee) => {
    const query = filters.search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [employee.fullName, employee.phone, employee.position]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return (
      matchesQuery &&
      (!filters.status || employee.status === filters.status) &&
      (!filters.role || employee.role === filters.role) &&
      (!filters.department || employee.department === filters.department) &&
      (!filters.branchId || employee.branchId === filters.branchId) &&
      (!filters.salaryType || employee.salaryType === filters.salaryType)
    );
  });

  const employeeColumns = useConfiguredColumns("hr-employees", [
    {
      key: "fullName",
      title: "Xodim",
      render: (_, employee) => (
        <Link className="hr-workspace__name-link" to={`/hr/employees/${employee.id}`}>
          {employee.fullName}
          <small>{employee.phone}</small>
        </Link>
      ),
    },
    { key: "position", title: "Lavozim" },
    { key: "department", title: "Bolim" },
    {
      key: "baseSalary",
      title: "Ish haqi",
      render: (_, employee) =>
        employee.salaryType === "HOURLY"
          ? `${money(employee.hourlyRate)} / soat`
          : `${money(employee.baseSalary)} / ${salaryTypeLabels[employee.salaryType]}`,
    },
    {
      key: "today",
      title: "Bugungi holat",
      render: (_, employee) => (
        <StatusBadge
          status={
            todayAttendance.find((record) => record.employeeId === employee.id)?.status ||
            "ABSENT"
          }
        />
      ),
    },
    {
      key: "shiftId",
      title: "Smena",
      render: (value) => {
        const shift = data.shifts.find((item) => item.id === value);

        return shift ? `${shift.startTime}-${shift.endTime}` : "-";
      },
    },
    {
      key: "status",
      title: "Holat",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      title: "Amallar",
      render: (_, employee) => (
        <div className="hr-workspace__row-actions">
          <Link to={`/hr/employees/${employee.id}`} aria-label="Korish">
            <Eye size={16} />
          </Link>
          <Link to={`/hr/employees/${employee.id}/edit`} aria-label="Tahrirlash">
            <Edit3 size={16} />
          </Link>
          <button type="button" onClick={() => handleDelete(employee)} aria-label="Ochirish">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]);

  const handleDelete = async (employee) => {
    try {
      if (hasEmployeeHistory(employee.id)) {
        await deactivateEmployee(employee.id);
      } else {
        await deleteEmployee(employee.id);
      }
      refresh();
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <>
      <KpiGrid
        items={[
          { label: "Jami xodim", value: data.summary.employeeCount, icon: Users },
          { label: "Faol xodim", value: data.summary.activeCount, icon: UserCheck, variant: "success" },
          { label: "Bugun ishda", value: data.summary.todayPresent, icon: CheckCircle2, variant: "success" },
          { label: "Oylik fondi", value: money(data.summary.salaryFund), icon: Banknote },
          { label: "Kechikkanlar", value: data.summary.lateCount, icon: Clock3, variant: "warning" },
          { label: "Tatildagilar", value: data.summary.onLeaveCount, icon: CalendarDays },
        ]}
      />

      <Card padding="lg" className="hr-workspace__filters">
        <Input
          label="Qidirish"
          value={filters.search}
          leftIcon={<Search size={16} />}
          placeholder="Ism, telefon, lavozim"
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <Select
          label="Holat"
          value={filters.status}
          options={optionize(EMPLOYEE_STATUSES, "Barcha holatlar")}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        />
        <Select
          label="Rol"
          value={filters.role}
          options={roleOptions}
          onChange={(event) => setFilters({ ...filters, role: event.target.value })}
        />
        <Select
          label="Bolim"
          value={filters.department}
          options={optionize(departments, "Barcha bolimlar")}
          onChange={(event) => setFilters({ ...filters, department: event.target.value })}
        />
        <Select
          label="Filial"
          value={filters.branchId}
          options={optionize(branches, "Barcha branchlar")}
          onChange={(event) => setFilters({ ...filters, branchId: event.target.value })}
        />
        <Select
          label="Maosh turi"
          value={filters.salaryType}
          options={optionize(SALARY_TYPES, "Barcha turlar").map((option) => ({
            ...option,
            label: salaryTypeLabels[option.value] || option.label,
          }))}
          onChange={(event) => setFilters({ ...filters, salaryType: event.target.value })}
        />
        <Link className="hr-workspace__create-link" to="/hr/employees/create">
          <Plus size={16} />
          Xodim qoshish
        </Link>
      </Card>

      <Card padding="lg">
        <Table
          columns={employeeColumns}
          data={rows}
          rowKey="id"
          emptyText="Xodim topilmadi."
        />
      </Card>
    </>
  );
};

const EmployeeFormPanel = ({ employee, shifts, onCancel, onSaved }) => {
  const hrSettings = useHrSettings();
  const [form, setForm] = useState(
    employee || {
      fullName: "",
      phone: "",
      email: "",
      position: "",
      department: "Umumiy",
      role: "Xodim",
      hireDate: todayIso(),
      salaryType: hrSettings.defaultSalaryType || "MONTHLY",
      baseSalary: 0,
      hourlyRate: 0,
      address: "",
      status: "ACTIVE",
      note: "",
      shiftId: hrSettings.defaultShiftId || DEFAULT_SHIFT_ID,
    },
  );
  const [error, setError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const saved = await upsertEmployee({
        ...form,
        baseSalary: safeMoney(form.baseSalary),
        hourlyRate: safeMoney(form.hourlyRate),
      });

      onSaved(saved);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <Card padding="lg">
      <form className="hr-workspace__form" onSubmit={handleSubmit}>
        {error && <div className="hr-workspace__error">{error}</div>}
        <Input label="F.I.Sh." required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
        <Input label="Telefon" required value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        <Input label="Lavozim" value={form.position} onChange={(event) => update("position", event.target.value)} />
        <Input label="Bolim" value={form.department} onChange={(event) => update("department", event.target.value)} />
        <Select
          label="Role"
          value={form.role}
          options={roleOptions.filter((option) => option.value)}
          onChange={(event) => update("role", event.target.value)}
        />
        <DatePicker label="Ishga kirgan sana" value={form.hireDate} onChange={(event) => update("hireDate", event.target.value)} />
        <Select
          label="Maosh turi"
          value={form.salaryType}
          options={SALARY_TYPES.map((value) => ({ value, label: salaryTypeLabels[value] }))}
          onChange={(event) => update("salaryType", event.target.value)}
        />
        <Input
          label={form.salaryType === "DAILY" ? "Kunlik stavka" : "Asosiy maosh"}
          type="number"
          min="0"
          value={form.baseSalary}
          onChange={(event) => update("baseSalary", event.target.value)}
        />
        {form.salaryType === "HOURLY" && (
          <Input
            label="Soatlik stavka"
            type="number"
            min="0"
            value={form.hourlyRate}
            onChange={(event) => update("hourlyRate", event.target.value)}
          />
        )}
        <Select
          label="Smena"
          value={form.shiftId}
          options={shifts.map((shift) => ({
            value: shift.id,
            label: `${shift.name} (${shift.startTime}-${shift.endTime})`,
          }))}
          onChange={(event) => update("shiftId", event.target.value)}
        />
        <Select
          label="Holat"
          value={form.status}
          options={EMPLOYEE_STATUSES.map((value) => ({ value, label: statusLabels[value] }))}
          onChange={(event) => update("status", event.target.value)}
        />
        <Input label="Manzil" value={form.address} onChange={(event) => update("address", event.target.value)} />
        <Textarea label="Izoh" value={form.note} onChange={(event) => update("note", event.target.value)} />
        <div className="hr-workspace__form-actions">
          <Button variant="secondary" onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button type="submit" leftIcon={<CheckCircle2 size={16} />}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
};

const EmployeeDetails = ({ employee, data, refresh }) => {
  const [modal, setModal] = useState(null);
  const attendance = getEmployeeAttendance(employee.id, { month: monthIso() });
  const payrolls = data.payrolls.filter((payroll) => payroll.employeeId === employee.id);
  const payments = getEmployeePaymentHistory(employee.id);
  const shift = data.shifts.find((item) => item.id === employee.shiftId);
  const debt = getEmployeeSalaryDebt(employee.id);
  const lastPayment = payments[0];

  return (
    <>
      <Card padding="lg" className="hr-workspace__identity">
        <div>
          <h2>{employee.fullName}</h2>
          <span>{employee.position || "Lavozim kiritilmagan"}</span>
        </div>
        <StatusBadge status={employee.status} />
        <strong>{employee.department}</strong>
        <b>{money(employee.baseSalary)}</b>
      </Card>

      <div className="hr-workspace__quick-actions">
        <Button leftIcon={<Clock3 size={16} />} onClick={() => setModal("attendance")}>
          Davomat
        </Button>
        <Button leftIcon={<HandCoins size={16} />} onClick={() => setModal("advance")}>
          Avans
        </Button>
        <Button leftIcon={<Gift size={16} />} onClick={() => setModal("bonus")}>
          Bonus
        </Button>
        <Button leftIcon={<FileMinus size={16} />} onClick={() => setModal("penalty")}>
          Jarima
        </Button>
        <Button leftIcon={<CalendarDays size={16} />} onClick={() => setModal("leave")}>
          Ta'til
        </Button>
        <Link className="hr-workspace__create-link" to={`/hr/employees/${employee.id}/edit`}>
          <Edit3 size={16} />
          Tahrirlash
        </Link>
      </div>

      <div className="hr-workspace__detail-grid">
        <DetailSection title="Kontaktlar" rows={[["Telefon", employee.phone], ["Email", employee.email || "-"], ["Manzil", employee.address || "-"]]} />
        <DetailSection
          title="Davomat"
          rows={[
            ["Joriy oy yozuvlari", attendance.length],
            ["Kechikish", attendance.filter((record) => record.status === "LATE").length],
            ["Kelmagan", attendance.filter((record) => record.status === "ABSENT").length],
          ]}
        />
        <DetailSection title="Smena" rows={[["Smena", shift?.name || "-"], ["Vaqt", shift ? `${shift.startTime}-${shift.endTime}` : "-"], ["Tanaffus", `${shift?.breakMinutes || 0} min`]]} />
        <DetailSection title="Maosh / oylik hisob-kitobi" rows={[["Maosh turi", salaryTypeLabels[employee.salaryType]], ["Jami qarz", money(debt)], ["Oxirgi to'lov", lastPayment ? money(lastPayment.amount) : "-"]]} />
        <DetailSection title="Avanslar" rows={getEmployeeAdvances(employee.id, monthIso()).map((item) => [item.date, money(item.amount)])} />
        <DetailSection title="Mukofotlar" rows={getEmployeeBonuses(employee.id, monthIso()).map((item) => [item.reason, money(item.amount)])} />
        <DetailSection title="Jarimalar" rows={getEmployeePenalties(employee.id, monthIso()).map((item) => [item.reason, money(item.amount)])} />
        <DetailSection title="Ta'tillar" rows={data.leaves.filter((leave) => leave.employeeId === employee.id).map((leave) => [leaveTypeLabels[leave.type] || leave.type, `${leave.startDate} - ${leave.endDate}`])} />
        <DetailSection title="To'lov tarixi" rows={payments.map((payment) => [payment.date, `${money(payment.amount)} / ${getPaymentMethodLabel(payment.method)}`])} />
        <DetailSection title="Izohlar" rows={[["Izoh", employee.note || "-"]]} />
      </div>

      <Card padding="lg">
        <Table
          columns={[
            { key: "month", title: "Oy" },
            { key: "netAmount", title: "Sof oylik", render: (value) => money(value) },
            { key: "paidAmount", title: "To'langan", render: (value) => money(value) },
            { key: "debtAmount", title: "Qarz", render: (value) => money(value) },
            { key: "status", title: "Holat", render: (value) => <StatusBadge status={value} /> },
          ]}
          data={payrolls}
          rowKey="id"
          emptyText="Oylik hisob-kitobi tarixi yo'q."
        />
      </Card>

      <ActionModal
        type={modal}
        employee={employee}
        cashboxes={data.cashboxes}
        onClose={() => setModal(null)}
        onDone={() => {
          setModal(null);
          refresh();
        }}
      />
    </>
  );
};

const AttendanceManager = ({ data, refresh }) => {
  const [filters, setFilters] = useState({
    date: todayIso(),
    employeeId: "",
    department: "",
    status: "",
  });
  const [modal, setModal] = useState(null);
  const departments = [...new Set(data.employees.map((employee) => employee.department))];
  const employeeMap = new Map(data.employees.map((employee) => [employee.id, employee]));
  const rows = data.attendance.filter((record) => {
    const employee = employeeMap.get(record.employeeId);

    return (
      (!filters.date || record.date === filters.date) &&
      (!filters.employeeId || record.employeeId === filters.employeeId) &&
      (!filters.department || employee?.department === filters.department) &&
      (!filters.status || record.status === filters.status)
    );
  });

  return (
    <>
      <Card padding="lg" className="hr-workspace__filters">
        <DatePicker label="Sana" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        <Select label="Xodim" value={filters.employeeId} options={[{ value: "", label: "Barcha xodimlar" }, ...data.employees.map((employee) => ({ value: employee.id, label: employee.fullName }))]} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })} />
        <Select label="Bolim" value={filters.department} options={optionize(departments, "Barcha bolimlar")} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
        <Select label="Holat" value={filters.status} options={optionize(ATTENDANCE_STATUSES, "Barcha holatlar").map((option) => ({ ...option, label: statusLabels[option.value] || option.label }))} onChange={(event) => setFilters({ ...filters, status: event.target.value })} />
        <Button leftIcon={<Plus size={16} />} onClick={() => setModal("attendance")}>
          Davomat belgilash
        </Button>
      </Card>

      <Card padding="lg">
        <Table
          columns={[
            { key: "employeeId", title: "Xodim", render: (value) => employeeMap.get(value)?.fullName || "-" },
            { key: "date", title: "Sana" },
            { key: "checkIn", title: "Kirish" },
            { key: "checkOut", title: "Chiqish" },
            { key: "status", title: "Holat", render: (value) => <StatusBadge status={value} /> },
            { key: "lateMinutes", title: "Kechikish", render: (value) => `${value} min` },
            { key: "workedMinutes", title: "Ish vaqti", render: (value) => `${(value / 60).toFixed(1)} soat` },
            { key: "note", title: "Izoh" },
          ]}
          data={rows}
          rowKey="id"
          emptyText="Davomat yozuvi yoq."
        />
      </Card>

      <ActionModal type={modal} employees={data.employees} employee={data.employees.find((item) => item.id === filters.employeeId)} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />
    </>
  );
};

const ShiftManager = ({ data, refresh }) => {
  const [form, setForm] = useState({
    id: "",
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    active: true,
  });

  const save = (event) => {
    event.preventDefault();
    upsertShift({ ...form, id: form.id || createHrId("shift") });
    setForm({ id: "", name: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60, active: true });
    refresh();
  };

  return (
    <div className="hr-workspace__split">
      <Card padding="lg">
        <Table
          columns={[
            { key: "name", title: "Smena" },
            { key: "startTime", title: "Boshlanish" },
            { key: "endTime", title: "Tugash" },
            { key: "breakMinutes", title: "Tanaffus", render: (value) => `${value} min` },
            { key: "active", title: "Faol", render: (value) => (value ? "Ha" : "Yo'q") },
            {
              key: "actions",
              title: "Amallar",
              render: (_, shift) => (
                <button className="hr-workspace__icon-action" type="button" onClick={() => setForm(shift)}>
                  <Edit3 size={16} />
                </button>
              ),
            },
          ]}
          data={data.shifts}
          rowKey="id"
        />
      </Card>
      <Card padding="lg">
        <form className="hr-workspace__form hr-workspace__form--single" onSubmit={save}>
          <Input label="Nomi" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Boshlanish" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          <Input label="Tugash" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          <Input label="Tanaffus daqiqasi" type="number" min="0" value={form.breakMinutes} onChange={(event) => setForm({ ...form, breakMinutes: event.target.value })} />
          <Select label="Faol" value={form.active ? "YES" : "NO"} options={[{ value: "YES", label: "Ha" }, { value: "NO", label: "Yo'q" }]} onChange={(event) => setForm({ ...form, active: event.target.value === "YES" })} />
          <Button type="submit">Smenani saqlash</Button>
        </form>
      </Card>
    </div>
  );
};

const PayrollManager = ({ data, refresh }) => {
  const [filters, setFilters] = useState({ month: monthIso(), department: "", status: "" });
  const [paying, setPaying] = useState(null);
  const employeeMap = new Map(data.employees.map((employee) => [employee.id, employee]));
  const departments = [...new Set(data.employees.map((employee) => employee.department))];
  const rows = data.payrolls.filter((payroll) => {
    const employee = employeeMap.get(payroll.employeeId);

    return (
      payroll.month === filters.month &&
      (!filters.department || employee?.department === filters.department) &&
      (!filters.status || payroll.status === filters.status)
    );
  });

  const calculateAll = async () => {
    await Promise.all(
      data.employees
        .filter((employee) => employee.status !== "INACTIVE")
        .map((employee) => saveCalculatedPayroll(employee.id, filters.month)),
    );
    refresh();
  };

  const payrollColumns = useConfiguredColumns("payroll", [
    { key: "employeeId", title: "Xodim", render: (value) => employeeMap.get(value)?.fullName || "-" },
    { key: "baseAmount", title: "Asos", render: (value, row) => `${money(value)} ${row.attendanceAdjustment ? `(${money(row.attendanceAdjustment)})` : ""}` },
    { key: "bonuses", title: "Mukofot", render: (value) => money(value) },
    { key: "advances", title: "Avans", render: (value) => money(value) },
    { key: "penalties", title: "Jarima", render: (value) => money(value) },
    { key: "netAmount", title: "Sof oylik", render: (value) => money(value) },
    { key: "paidAmount", title: "To'langan", render: (value) => money(value) },
    { key: "debtAmount", title: "Qarz", render: (value) => money(value) },
    { key: "status", title: "Holat", render: (value) => <StatusBadge status={value} /> },
    {
      key: "actions",
      title: "Amallar",
      render: (_, payroll) => (
        <div className="hr-workspace__row-actions">
          <button type="button" onClick={async () => { await saveCalculatedPayroll(payroll.employeeId, payroll.month); refresh(); }}>
            <Clock3 size={16} />
          </button>
          <button type="button" disabled={payroll.debtAmount <= 0} onClick={() => setPaying(payroll)}>
            <HandCoins size={16} />
          </button>
        </div>
      ),
    },
  ]);

  return (
    <>
      <Card padding="lg" className="hr-workspace__filters">
        <Input label="Oy" type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value || monthIso() })} />
        <Select label="Bolim" value={filters.department} options={optionize(departments, "Barcha bolimlar")} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
        <Select label="Holat" value={filters.status} options={optionize(PAYROLL_STATUSES, "Barcha holatlar").map((option) => ({ ...option, label: statusLabels[option.value] || option.label }))} onChange={(event) => setFilters({ ...filters, status: event.target.value })} />
        <Button leftIcon={<Banknote size={16} />} onClick={calculateAll}>
          Barchasini hisoblash
        </Button>
      </Card>

      <Card padding="lg">
        <Table
          columns={payrollColumns}
          data={rows}
          rowKey="id"
          emptyText="Oylik hisob-kitobi topilmadi. Barchasini hisoblash tugmasini bosing."
        />
      </Card>

      <PaymentModal payroll={paying} cashboxes={data.cashboxes} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refresh(); }} />
    </>
  );
};

const LeaveManager = ({ data, refresh }) => {
  const [modal, setModal] = useState(null);
  const employeeMap = new Map(data.employees.map((employee) => [employee.id, employee]));

  return (
    <>
      <Card padding="lg" className="hr-workspace__toolbar">
        <Button leftIcon={<Plus size={16} />} onClick={() => setModal("leave")}>
          Ta'til qo'shish
        </Button>
      </Card>
      <Card padding="lg">
        <Table
          columns={[
            { key: "employeeId", title: "Xodim", render: (value) => employeeMap.get(value)?.fullName || "-" },
            { key: "type", title: "Turi", render: (value) => leaveTypeLabels[value] || value },
            { key: "startDate", title: "Boshlanish" },
            { key: "endDate", title: "Tugash" },
            { key: "paid", title: "To'lanadi", render: (value) => (value ? "Ha" : "Yo'q") },
            { key: "status", title: "Holat", render: (value) => <StatusBadge status={value} /> },
            { key: "note", title: "Izoh" },
          ]}
          data={data.leaves}
          rowKey="id"
          emptyText="Tatil yozuvi yoq."
        />
      </Card>
      <ActionModal type={modal} employees={data.employees} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />
    </>
  );
};

const ActionModal = ({ type, employee, employees = [], cashboxes = [], onClose, onDone }) => {
  const [form, setForm] = useState({
    employeeId: employee?.id || "",
    date: todayIso(),
    checkIn: "09:00",
    checkOut: "18:00",
    status: "PRESENT",
    amount: "",
    reason: "",
    note: "",
    type: "ANNUAL",
    startDate: todayIso(),
    endDate: todayIso(),
    leaveStatus: "REQUESTED",
    paid: false,
    paymentMethod: "CASH",
    cashboxId: "",
  });
  const [error, setError] = useState("");

  if (!type) {
    return null;
  }

  const employeeOptions = employees.length
    ? employees.map((item) => ({ value: item.id, label: item.fullName }))
    : [{ value: employee?.id || "", label: employee?.fullName || "-" }];

  const submit = async () => {
    setError("");
    try {
      if (type === "attendance") {
        upsertAttendance({
          employeeId: form.employeeId,
          date: form.date,
          checkIn: ["PRESENT", "LATE"].includes(form.status) ? form.checkIn : "",
          checkOut: ["PRESENT", "LATE"].includes(form.status) ? form.checkOut : "",
          status: form.status,
          note: form.note,
        });
      } else if (type === "advance") {
        await addAdvance({
          employeeId: employee.id,
          amount: form.amount,
          date: form.date,
          note: form.note,
          paymentMethod: form.paymentMethod,
          cashboxId: form.cashboxId,
        });
      } else if (type === "bonus") {
        addBonus({ employeeId: employee.id, amount: form.amount, reason: form.reason || "Mukofot", date: form.date, note: form.note });
      } else if (type === "penalty") {
        addPenalty({ employeeId: employee.id, amount: form.amount, reason: form.reason || "Boshqa", date: form.date, note: form.note });
      } else if (type === "leave") {
        upsertLeave({
          employeeId: form.employeeId || employee?.id,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.leaveStatus,
          paid: form.paid,
          note: form.note,
        });
      }
      onDone();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const titleMap = {
    attendance: "Davomat belgilash",
    advance: "Avans berish",
    bonus: "Mukofot qo'shish",
    penalty: "Jarima qo'shish",
    leave: "Ta'til qo'shish",
  };

  return (
    <Modal
      open
      title={titleMap[type]}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit}>Saqlash</Button>
        </>
      }
    >
      <div className="hr-workspace__form">
        {error && <div className="hr-workspace__error">{error}</div>}
        {(type === "attendance" || type === "leave") && (
          <Select label="Xodim" value={form.employeeId} options={employeeOptions} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} />
        )}
        {type === "attendance" && (
          <>
            <DatePicker label="Sana" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <Input label="Kirish" type="time" value={form.checkIn} onChange={(event) => setForm({ ...form, checkIn: event.target.value })} />
            <Input label="Chiqish" type="time" value={form.checkOut} onChange={(event) => setForm({ ...form, checkOut: event.target.value })} />
            <Select label="Holat" value={form.status} options={ATTENDANCE_STATUSES.map((value) => ({ value, label: statusLabels[value] }))} onChange={(event) => setForm({ ...form, status: event.target.value })} />
          </>
        )}
        {["advance", "bonus", "penalty"].includes(type) && (
          <>
            <DatePicker label="Sana" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <Input label="Summa" type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </>
        )}
        {type === "advance" && (
          <>
            <Select label="To'lov turi" value={form.paymentMethod} options={paymentMethodOptions} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} />
            <Select label="Kassa" value={form.cashboxId} options={[{ value: "", label: "Default kassa" }, ...cashboxes.map((cashbox) => ({ value: cashbox.id, label: cashbox.name }))]} onChange={(event) => setForm({ ...form, cashboxId: event.target.value })} />
          </>
        )}
        {type === "bonus" && <Input label="Sabab" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />}
        {type === "penalty" && (
          <Select label="Sabab" value={form.reason} options={PENALTY_REASONS.map((value) => ({ value, label: value }))} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
        )}
        {type === "leave" && (
          <>
            <Select label="Turi" value={form.type} options={LEAVE_TYPES.map((value) => ({ value, label: leaveTypeLabels[value] || value }))} onChange={(event) => setForm({ ...form, type: event.target.value })} />
            <DatePicker label="Boshlanish" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            <DatePicker label="Tugash" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
            <Select label="Holat" value={form.leaveStatus} options={LEAVE_STATUSES.map((value) => ({ value, label: statusLabels[value] }))} onChange={(event) => setForm({ ...form, leaveStatus: event.target.value })} />
            <Select label="To'lanadi" value={form.paid ? "YES" : "NO"} options={[{ value: "YES", label: "Ha" }, { value: "NO", label: "Yo'q" }]} onChange={(event) => setForm({ ...form, paid: event.target.value === "YES" })} />
          </>
        )}
        <Textarea label="Izoh" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </div>
    </Modal>
  );
};

const PaymentModal = ({ payroll, cashboxes, onClose, onDone }) => {
  const defaults = useDefaultSettings();
  const hrSettings = useHrSettings();
  const [form, setForm] = useState({
    amount: payroll?.debtAmount || "",
    method: defaults.paymentMethod || "CASH",
    date: todayIso(),
    cashboxId: defaults.cashboxId || "",
    note: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, amount: payroll?.debtAmount || "" }));
  }, [payroll]);

  if (!payroll) {
    return null;
  }

  const submit = async () => {
    setError("");
    try {
      if (
        hrSettings.payrollPaymentConfirmation &&
        !window.confirm("Oylik to'lovi tasdiqlansinmi?")
      ) {
        return;
      }

      await payPayroll({ payrollId: payroll.id, ...form });
      onDone();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <Modal
      open
      title="Oylik to'lovi"
      description={`Qarz: ${money(payroll.debtAmount)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit}>To'lash</Button>
        </>
      }
    >
      <div className="hr-workspace__form">
        {error && <div className="hr-workspace__error">{error}</div>}
        <Input label="Summa" type="number" min="1" max={payroll.debtAmount} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        <Select label="To'lov turi" value={form.method} options={paymentMethodOptions} onChange={(event) => setForm({ ...form, method: event.target.value })} />
        <DatePicker label="Sana" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <Select label="Kassa" value={form.cashboxId} options={[{ value: "", label: "Default kassa" }, ...cashboxes.map((cashbox) => ({ value: cashbox.id, label: cashbox.name }))]} onChange={(event) => setForm({ ...form, cashboxId: event.target.value })} />
        <Textarea label="Izoh" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </div>
    </Modal>
  );
};

const KpiGrid = ({ items }) => (
  <section className="hr-workspace__kpis">
    {items.map((item) => {
      const Icon = item.icon;

      return (
        <Card key={item.label} variant="soft" padding="md" className="hr-workspace__kpi">
          <div className={`hr-workspace__kpi-icon ${item.variant ? `hr-workspace__kpi-icon--${item.variant}` : ""}`}>
            <Icon size={20} />
          </div>
          <span>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </span>
        </Card>
      );
    })}
  </section>
);

const SignalPanel = ({ title, rows }) => (
  <Card padding="lg" className="hr-workspace__panel">
    <h3>{title}</h3>
    <div className="hr-workspace__signals">
      {rows.length ? (
        rows.slice(0, 6).map((row) => (
          <span key={row.id}>
            <b>{row.name}</b>
            <small>{row.value}</small>
          </span>
        ))
      ) : (
        <p>Malumot yoq.</p>
      )}
    </div>
  </Card>
);

const DetailSection = ({ title, rows }) => (
  <Card padding="md" className="hr-workspace__detail-section">
    <h3>{title}</h3>
    <div>
      {rows.length ? (
        rows.map(([label, value]) => (
          <span key={`${label}-${value}`}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))
      ) : (
        <p>Malumot yoq.</p>
      )}
    </div>
  </Card>
);

export { buildHrReport, calculateEmployeePayroll };
export default HrWorkspace;
