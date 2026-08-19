import { Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import Button from "../../../../shared/ui/Button/Button";
import Input from "../../../../shared/ui/Input/Input";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import PasswordField from "../../components/PasswordField/PasswordField";
import authService from "../../services/authService";
import { setAuth } from "../../../../store/slices/authSlice";
import { setCompany } from "../../../../store/slices/tenantSlice";
import { setSettings } from "../../../../store/slices/settingsSlice";
import { setEnabledModules } from "../../../../store/slices/modulesSlice";
import {
  loadPlatformSettings,
  markSettingsHydrated,
} from "../../../settings/utils/settingsStorage";
import { SUPER_ADMIN_ROLE } from "../../../../constants/auth";
import { resetTenant } from "../../../../store/slices/tenantSlice";
import { preloadBusinessData } from "../../../../services/api/businessDataLoader";

import "../authPages.scss";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = values.identifier.trim() && values.password;

  const updateValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValid || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authService.login(values);
      dispatch(setAuth(result));
      const isSuperAdmin = result.user?.role === SUPER_ADMIN_ROLE;

      if (isSuperAdmin) {
        dispatch(resetTenant());
      } else if (result.account) {
        dispatch(setCompany({ id: result.account.id, name: result.account.businessName, ...result.account }));
      }
      if (Array.isArray(result.modules)) {
        dispatch(setEnabledModules(result.modules));
      }
      if (!isSuperAdmin) {
        await preloadBusinessData();
        const settings = await loadPlatformSettings();
        markSettingsHydrated();
        dispatch(setSettings(settings));
      }
      navigate(isSuperAdmin ? "/superadmin" : "/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Email yoki parol noto'g'ri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Hisobga kirish"
      subtitle="Email yoki telefon raqamingiz orqali kompaniya ish muhitingizni oching."
      footer={
        <>
          Yangi kompaniya ochasizmi? <Link to="/register">Ro'yxatdan o'tish</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}
        {location.state?.message && <div className="auth-form__notice" role="status">{location.state.message}</div>}

        <Input
          label="Email yoki telefon"
          name="identifier"
          value={values.identifier}
          autoComplete="username"
          leftIcon={<Mail size={17} />}
          onChange={(event) => updateValue("identifier", event.target.value)}
          required
        />

        <PasswordField
          id="login-password"
          name="password"
          label="Parol"
          value={values.password}
          autoComplete="current-password"
          onChange={(event) => updateValue("password", event.target.value)}
        />

        <label className="auth-form__check">
          <input
            type="checkbox"
            checked={values.rememberMe}
            onChange={(event) => updateValue("rememberMe", event.target.checked)}
          />
          <span>Eslab qolish</span>
        </label>

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!isValid}
          leftIcon={<ShieldCheck size={18} />}
        >
          Bosh sahifaga kirish
        </Button>

        <Link className="auth-form__link" to="/forgot-password">
          Parolni tiklash
        </Link>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
