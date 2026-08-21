import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Ban,
  CheckCircle2,
  Eye,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { translateText } from "../../../../localization/i18n";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  Table,
  Toast,
} from "../../../../shared/ui";

import {
  deleteSuperAdminUser,
  getSuperAdminUsers,
  updateSuperAdminUserStatus,
} from "../../services/superAdminApi";

import "./UsersPage.scss";

const STATUS_OPTIONS = [
  {
    value: "",
    label: "Barcha holatlar",
  },
  {
    value: "ACTIVE",
    label: "Faol",
  },
  {
    value: "BLOCKED",
    label: "Bloklangan",
  },
];

const UsersPage = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [actionUserId, setActionUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const result = await getSuperAdminUsers();

      setUsers(result);
      setError("");
    } catch (err) {
      setError(err.message || "Userlarni yuklab bo‘lmadi.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();

    /*
     * MVP real-time:
     * backend websocket hali yo‘q bo‘lsa
     * har 5 sekundda yangi userlarni tekshiradi.
     */
    const timer = window.setInterval(() => {
      loadUsers(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchable = [
        user.name,
        user.fullName,
        user.email,
        user.phone,
        user.companyName,
        user.businessName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!statusFilter || normalizeStatus(user.status) === statusFilter)
      );
    });
  }, [users, search, statusFilter]);

  const stats = useMemo(() => {
    const active = users.filter(
      (user) => normalizeStatus(user.status) === "ACTIVE",
    ).length;

    const blocked = users.filter(
      (user) => normalizeStatus(user.status) === "BLOCKED",
    ).length;

    const today = new Date();

    const newToday = users.filter((user) => {
      const created = parseDate(user.createdAt);

      if (!created) {
        return false;
      }

      return (
        created.getFullYear() === today.getFullYear() &&
        created.getMonth() === today.getMonth() &&
        created.getDate() === today.getDate()
      );
    }).length;

    return {
      total: users.length,
      active,
      blocked,
      newToday,
    };
  }, [users]);

  const handleStatus = async (user) => {
    const current = normalizeStatus(user.status);

    const nextStatus = current === "BLOCKED" ? "ACTIVE" : "BLOCKED";

    setActionUserId(user.id);

    try {
      await updateSuperAdminUserStatus(user.id, nextStatus);

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item,
        ),
      );
    } catch (err) {
      setActionError(err.message || "Statusni o'zgartirib bo'lmadi.");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async (user) => {
    setDeleteTarget(user);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setActionUserId(deleteTarget.id);
    setActionError("");

    try {
      await deleteSuperAdminUser(deleteTarget.id);

      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err.message || "Userni o'chirib bo'lmadi.");
    } finally {
      setActionUserId(null);
    }
  };

  const columns = [
    {
      key: "user",
      title: translateText("Foydalanuvchi"),

      render: (_, user) => (
        <div className="sa-users__user">
          <div className="sa-users__avatar">
            <UserRound size={17} />
          </div>

          <div>
            <strong>{user.name || user.fullName || translateText("Nomsiz foydalanuvchi")}</strong>

            <span>{user.email || user.phone || "—"}</span>
          </div>
        </div>
      ),
    },

    {
      key: "companyName",

      title: translateText("Kompaniya"),

      render: (value, user) => value || user.businessName || "—",
    },

    {
      key: "role",
      title: translateText("Rol"),

      render: (value) => value || "USER",
    },

    {
      key: "status",
      title: translateText("Holat"),

      render: (value) => {
        const status = normalizeStatus(value);

        return (
          <Badge variant={status === "BLOCKED" ? "danger" : "success"}>
            {status === "BLOCKED" ? "Bloklangan" : "Faol"}
          </Badge>
        );
      },
    },

    {
      key: "createdAt",
      title: "Ro‘yxatdan o‘tgan",

      render: (value) => formatDate(value),
    },

    {
      key: "actions",
      title: "",

      render: (_, user) => {
        const blocked = normalizeStatus(user.status) === "BLOCKED";

        const busy = actionUserId === user.id;

        return (
          <div className="sa-users__actions">
            <Button
              size="sm"
              variant="ghost"
              title="Ko‘rish"
              onClick={() => navigate(`/superadmin/users/${user.id}`)}
            >
              <Eye size={16} />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              title={blocked ? translateText("Faollashtirish") : translateText("Bloklash")}
              onClick={() => handleStatus(user)}
            >
              {blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              title="O‘chirish"
              onClick={() => handleDelete(user)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="sa-users">
      {actionError && <Toast type="error" message={actionError} onClose={() => setActionError("")} />}
      <header className="sa-users__header">
        <div>
          <h1>{translateText("Foydalanuvchilar")}</h1>

          <p>Platformaga ro‘yxatdan o‘tgan akkauntlarni boshqaring.</p>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCcw size={16} />}
          onClick={() => loadUsers()}
        >
          Yangilash
        </Button>
      </header>

      <section className="sa-users__stats">
        <StatCard icon={<Users />} label="Jami" value={stats.total} />

        <StatCard icon={<CheckCircle2 />} label="Faol" value={stats.active} />

        <StatCard icon={<Ban />} label="Bloklangan" value={stats.blocked} />

        <StatCard
          icon={<UserRound />}
          label="Bugun yangi"
          value={stats.newToday}
        />
      </section>

      <Card padding="md" className="sa-users__workspace">
        <div className="sa-users__toolbar">
          <div className="sa-users__search">
            <Input
              value={search}
              placeholder={translateText("Foydalanuvchi, email, telefon yoki kompaniya...")}
              leftIcon={<Search size={16} />}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="sa-users__filter">
            <Select
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
        </div>

        {error && <div className="sa-users__error">{error}</div>}

        {loading ? (
          <div className="sa-users__loading">{translateText("Foydalanuvchilar yuklanmoqda...")}</div>
        ) : filteredUsers.length ? (
          <Table columns={columns} data={filteredUsers} rowKey="id" />
        ) : (
          <EmptyState
            title={translateText("Foydalanuvchi topilmadi")}
            description="Hozircha mos akkaunt mavjud emas."
          />
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="User o'chirilsinmi?"
        description={`${deleteTarget?.name || deleteTarget?.fullName || deleteTarget?.email || translateText("Foydalanuvchi")} akkauntini o'chirishni tasdiqlaysizmi?`}
        confirmText="O'chirish"
        loading={Boolean(deleteTarget && actionUserId === deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <Card padding="md" className="sa-users__stat">
    <div className="sa-users__stat-icon">{icon}</div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </Card>
);

const normalizeStatus = (status) => {
  const value = String(status || "ACTIVE").toUpperCase();

  if (["BLOCKED", "BANNED", "DISABLED", "SUSPENDED"].includes(value)) {
    return "BLOCKED";
  }

  return "ACTIVE";
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default UsersPage;
