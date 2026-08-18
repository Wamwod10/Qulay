import { ArrowLeft, Ban, CheckCircle2, Trash2, UserRound } from "lucide-react";

import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { translateText } from "../../../../localization/i18n";

import { Badge, Button, Card, EmptyState } from "../../../../shared/ui";

import {
  deleteSuperAdminUser,
  getSuperAdminUser,
  updateSuperAdminUserStatus,
} from "../../services/superAdminApi";

import AccountModulesManager from "../../components/AccountModulesManager/AccountModulesManager";

import "./UserDetailsPage.scss";

const UserDetailsPage = () => {
  const navigate = useNavigate();

  const { userId } = useParams();

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const result = await getSuperAdminUser(userId);

        setUser(result);
        setError("");
      } catch (err) {
        setError(err.message || "User ma’lumotlarini yuklab bo‘lmadi.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  if (loading) {
    return <div className="sa-user-details__loading">{translateText("Foydalanuvchi yuklanmoqda...")}</div>;
  }

  if (error || !user) {
    return (
      <EmptyState
        title={translateText("Foydalanuvchi topilmadi")}
        description={error || translateText("Bu foydalanuvchi mavjud emas.")}
      />
    );
  }

  const blocked = normalizeStatus(user.status) === "BLOCKED";

  const handleStatus = async () => {
    const nextStatus = blocked ? "ACTIVE" : "BLOCKED";

    setActionLoading(true);

    try {
      const updated = await updateSuperAdminUserStatus(user.id, nextStatus);

      setUser(
        updated || {
          ...user,
          status: nextStatus,
        },
      );
    } catch (err) {
      window.alert(err.message || "Statusni o‘zgartirib bo‘lmadi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      translateText("Bu foydalanuvchi akkauntini butunlay o'chirishni tasdiqlaysizmi?"),
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      await deleteSuperAdminUser(user.id);

      navigate("/superadmin/users", {
        replace: true,
      });
    } catch (err) {
      window.alert(err.message || "Userni o‘chirib bo‘lmadi.");

      setActionLoading(false);
    }
  };

  return (
    <div className="sa-user-details">
      <header className="sa-user-details__header">
        <div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate("/superadmin/users")}
          >
            {translateText("Foydalanuvchilarga qaytish")}
          </Button>

          <div className="sa-user-details__title">
            <div className="sa-user-details__avatar">
              <UserRound size={22} />
            </div>

            <div>
              <div>
                <h1>{getUserName(user)}</h1>

                <Badge variant={blocked ? "danger" : "success"}>
                  {blocked ? "Bloklangan" : "Faol"}
                </Badge>
              </div>

              <p>{user.email || user.phone || "Kontakt mavjud emas"}</p>
            </div>
          </div>
        </div>

        <div className="sa-user-details__header-actions">
          <Button
            variant="secondary"
            disabled={actionLoading}
            leftIcon={blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
            onClick={handleStatus}
          >
            {blocked ? "Faollashtirish" : "Bloklash"}
          </Button>

          <Button
            variant="danger"
            disabled={actionLoading}
            leftIcon={<Trash2 size={16} />}
            onClick={handleDelete}
          >
            O‘chirish
          </Button>
        </div>
      </header>

      <section className="sa-user-details__summary">
        <SummaryItem
          label="Kompaniya"
          value={user.companyName || user.businessName || "—"}
        />

        <SummaryItem label="Rol" value={user.role || "USER"} />

        <SummaryItem
          label="Ro‘yxatdan o‘tgan"
          value={formatDate(user.createdAt)}
        />

        <SummaryItem
          label="Oxirgi faollik"
          value={formatDate(user.lastActiveAt || user.updatedAt)}
        />
      </section>

      <Card padding="lg" className="sa-user-details__info">
        <div className="sa-user-details__section-title">
          <h3>Akkaunt ma’lumotlari</h3>

          <p>{translateText("Foydalanuvchi va biznes haqidagi asosiy ma'lumotlar.")}</p>
        </div>

        <div className="sa-user-details__info-grid">
          <InfoItem label="F.I.Sh." value={getUserName(user)} />

          <InfoItem label="Email" value={user.email} />

          <InfoItem label="Telefon" value={user.phone} />

          <InfoItem
            label="Kompaniya"
            value={user.companyName || user.businessName}
          />

          <InfoItem label={translateText("Foydalanuvchi ID")} value={user.id} />

          <InfoItem
            label={translateText("Kompaniya ID")}
            value={user.companyId || user.businessId}
          />
        </div>
      </Card>

      <AccountModulesManager user={user} />
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <Card padding="md" className="sa-user-details__summary-item">
    <span>{label}</span>

    <strong>{value || "—"}</strong>
  </Card>
);

const InfoItem = ({ label, value }) => (
  <div className="sa-user-details__info-item">
    <span>{label}</span>

    <strong>{value || "—"}</strong>
  </div>
);

const getUserName = (user) =>
  user.name || user.fullName || user.email || user.phone || "Nomsiz foydalanuvchi";

const normalizeStatus = (status) => {
  const value = String(status || "ACTIVE").toUpperCase();

  if (["BLOCKED", "BANNED", "DISABLED", "SUSPENDED"].includes(value)) {
    return "BLOCKED";
  }

  return "ACTIVE";
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

export default UserDetailsPage;
