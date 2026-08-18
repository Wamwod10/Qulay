import { Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { loadPlatformSettings } from "../../../settings/utils/settingsStorage";

import "../authPages.scss";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
      if (result.account) {
        dispatch(setCompany({ id: result.account.id, name: result.account.businessName, ...result.account }));
      }
      if (Array.isArray(result.modules)) {
        dispatch(setEnabledModules(result.modules));
      }
      dispatch(setSettings(loadPlatformSettings()));
      navigate(result.user?.role === "SUPER_ADMIN" ? "/superadmin" : "/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Email yoki parol noto'g'ri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Accountga kirish"
      subtitle="Email yoki telefon raqamingiz orqali kompaniya workspace'ingizni oching."
      footer={
        <>
          Yangi kompaniya ochasizmi? <Link to="/register">Register</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}

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
          <span>Remember me</span>
        </label>

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!isValid}
          leftIcon={<ShieldCheck size={18} />}
        >
          Dashboard'ga kirish
        </Button>

        <Link className="auth-form__link" to="/forgot-password">
          Parolni tiklash
        </Link>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
