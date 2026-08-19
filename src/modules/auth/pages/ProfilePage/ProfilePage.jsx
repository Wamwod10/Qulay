import { Building2, KeyRound, LogOut, Save, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Button from "../../../../shared/ui/Button/Button";
import Input from "../../../../shared/ui/Input/Input";
import PasswordField from "../../components/PasswordField/PasswordField";
import authService from "../../services/authService";
import { logout, setAuth } from "../../../../store/slices/authSlice";
import { setCompany } from "../../../../store/slices/tenantSlice";
import { updateSection } from "../../../../store/slices/settingsSlice";
import { SUPPORTED_CURRENCIES } from "../../../../shared/utils/currency";

import "./ProfilePage.scss";

const AVATAR_MAX_SIZE = 1024 * 1024;
const LOGO_MAX_SIZE = 2 * 1024 * 1024;

const roleLabel = {
  OWNER: "Egasi",
  ADMIN: "Administrator",
  MANAGER: "Menejer",
  CASHIER: "Kassir",
  WAREHOUSE: "Ombor",
  ACCOUNTANT: "Buxgalter",
  EMPLOYEE: "Xodim",
};

const readImageFile = (file, maxSize) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (file.size > maxSize) {
      reject(new Error(`Fayl hajmi ${Math.round(maxSize / 1024 / 1024)}MB dan oshmasin.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Fayl o'qilmadi."));
    reader.readAsDataURL(file);
  });

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, account, session } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    jobTitle: user?.jobTitle || "",
    avatar: user?.avatar || "",
  });
  const [company, setCompanyForm] = useState({
    businessName: account?.businessName || "",
    businessType: account?.businessType || "",
    phone: account?.phone || "",
    email: account?.email || "",
    address: account?.address || "",
    country: account?.country || "",
    currency: account?.currency || "UZS",
    taxId: account?.taxId || "",
    logo: account?.logo || "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  const initials = useMemo(
    () =>
      String(profile.fullName || user?.email || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "U",
    [profile.fullName, user?.email],
  );

  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat("uz-UZ").format(new Date(user.createdAt))
    : "-";

  const syncResult = (result) => {
    dispatch(setAuth(result));
    dispatch(setCompany({ id: result.account.id, name: result.account.businessName, ...result.account }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setLoading("profile");
    setError("");
    setMessage("");

    try {
      const result = await authService.updateProfile(profile);
      syncResult(result);
      setMessage("Profil yangilandi.");
    } catch (saveError) {
      setError(saveError.message || "Profil saqlanmadi.");
    } finally {
      setLoading("");
    }
  };

  const saveCompany = async (event) => {
    event.preventDefault();
    setLoading("company");
    setError("");
    setMessage("");

    try {
      const result = await authService.updateAccount(company);
      syncResult(result);
      dispatch(
        updateSection({
          section: "pos",
          changes: { receiptHeader: result.account.businessName },
        }),
      );
      dispatch(updateSection({ section: "formats", changes: { currency: result.account.currency } }));
      setMessage("Kompaniya profili yangilandi.");
    } catch (saveError) {
      setError(saveError.message || "Kompaniya saqlanmadi.");
    } finally {
      setLoading("");
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setLoading("password");
    setError("");
    setMessage("");

    try {
      await authService.changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Parol yangilandi.");
    } catch (passwordError) {
      setError(passwordError.message || "Parol yangilanmadi.");
    } finally {
      setLoading("");
    }
  };

  const handleImage = async (event, key, setter, maxSize) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const image = await readImageFile(file, maxSize);
      setter((current) => ({ ...current, [key]: image }));
    } catch (imageError) {
      setError(imageError.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <main className="profile-page">
      <section className="profile-page__hero">
        <div className="profile-page__avatar">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{initials}</span>}
        </div>
        <div>
          <span>{roleLabel[user?.role] || user?.role || "Foydalanuvchi"}</span>
          <h1>{user?.fullName || user?.email}</h1>
          <p>{account?.businessName} / {joinedDate}</p>
        </div>
      </section>

      {(error || message) && (
        <div className={error ? "profile-page__notice profile-page__notice--error" : "profile-page__notice"}>
          {error || message}
        </div>
      )}

      <div className="profile-page__grid">
        <form className="profile-card" onSubmit={saveProfile}>
          <div className="profile-card__title">
            <UserRound size={19} />
            <h2>Shaxsiy ma'lumotlar</h2>
          </div>
          <Input
            label="F.I.Sh."
            value={profile.fullName}
            autoComplete="name"
            onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={profile.email}
            autoComplete="email"
            onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Input
            label="Telefon"
            value={profile.phone}
            autoComplete="tel"
            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
            required
          />
          <Input
            label="Lavozim"
            value={profile.jobTitle}
            autoComplete="organization-title"
            onChange={(event) => setProfile((current) => ({ ...current, jobTitle: event.target.value }))}
          />
          <label className="profile-card__file">
            <span>Avatar rasmi</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImage(event, "avatar", setProfile, AVATAR_MAX_SIZE)}
            />
          </label>
          <Button type="submit" loading={loading === "profile"} leftIcon={<Save size={18} />}>
            Profilni saqlash
          </Button>
        </form>

        <form className="profile-card" onSubmit={saveCompany}>
          <div className="profile-card__title">
            <Building2 size={19} />
            <h2>Kompaniya profili</h2>
          </div>
          <Input
            label="Biznes nomi"
            value={company.businessName}
            onChange={(event) => setCompanyForm((current) => ({ ...current, businessName: event.target.value }))}
            required
          />
          <Input
            label="Telefon"
            value={company.phone}
            onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={company.email}
            onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            label="Manzil"
            value={company.address}
            onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))}
          />
          <Input
            label="Mamlakat"
            value={company.country}
            onChange={(event) => setCompanyForm((current) => ({ ...current, country: event.target.value }))}
          />
          <label className="profile-card__select">
            <span>Valyuta</span>
            <select
              value={company.currency}
              onChange={(event) => setCompanyForm((current) => ({ ...current, currency: event.target.value }))}
            >
              {SUPPORTED_CURRENCIES.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
            </select>
          </label>
          <Input
            label="Soliq ID"
            value={company.taxId}
            onChange={(event) => setCompanyForm((current) => ({ ...current, taxId: event.target.value }))}
          />
          <label className="profile-card__file">
            <span>Logotip</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImage(event, "logo", setCompanyForm, LOGO_MAX_SIZE)}
            />
          </label>
          <Button type="submit" loading={loading === "company"} leftIcon={<Save size={18} />}>
            Kompaniyani saqlash
          </Button>
        </form>

        <form className="profile-card" onSubmit={changePassword}>
          <div className="profile-card__title">
            <KeyRound size={19} />
            <h2>Xavfsizlik</h2>
          </div>
          <PasswordField
            id="current-password"
            label="Joriy parol"
            value={passwords.currentPassword}
            autoComplete="current-password"
            onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
          />
          <PasswordField
            id="new-password"
            label="Yangi parol"
            value={passwords.newPassword}
            autoComplete="new-password"
            onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
          />
          <PasswordField
            id="confirm-new-password"
            label="Parolni tasdiqlash"
            value={passwords.confirmPassword}
            autoComplete="new-password"
            onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
          />
          <Button type="submit" loading={loading === "password"} leftIcon={<KeyRound size={18} />}>
            Parolni almashtirish
          </Button>
        </form>

        <section className="profile-card">
          <div className="profile-card__title">
            <LogOut size={19} />
            <h2>Afzalliklar</h2>
          </div>
          <dl className="profile-card__session">
            <div>
              <dt>Sessiya</dt>
              <dd>{session?.rememberMe ? "Doimiy" : "Vaqtinchalik"}</dd>
            </div>
            <div>
              <dt>Kirish vaqti</dt>
              <dd>{session?.loginAt ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.loginAt)) : "-"}</dd>
            </div>
            <div>
              <dt>Hisob ID</dt>
              <dd>{account?.id}</dd>
            </div>
          </dl>
          <Button type="button" variant="secondary" leftIcon={<LogOut size={18} />} onClick={handleLogout}>
            Chiqish
          </Button>
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
