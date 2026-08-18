import { Building2, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
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

const INITIAL_VALUES = {
  businessName: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  businessType: "",
  country: "Uzbekistan",
  currency: "UZS",
};

const validate = (values) => {
  const errors = {};
  const email = values.email.trim();

  if (!values.businessName.trim()) errors.businessName = "Kompaniya nomi majburiy.";
  if (!values.fullName.trim()) errors.fullName = "Owner F.I.Sh. majburiy.";
  if (!email) errors.email = "Email majburiy.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Email formati noto'g'ri.";
  if (!values.phone.trim()) errors.phone = "Telefon majburiy.";
  if (values.password.length < 8) errors.password = "Kamida 8 belgi.";
  else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = "Kamida 1 harf va 1 raqam bo'lishi kerak.";
  }
  if (values.password !== values.confirmPassword) errors.confirmPassword = "Parollar mos emas.";

  return errors;
};

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const errors = useMemo(() => validate(values), [values]);
  const strength = getStrength(values.password);
  const isValid = Object.keys(errors).length === 0;

  const updateValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValid || loading) {
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const result = await authService.register(values);
      dispatch(setAuth(result));
      if (result.account) {
        dispatch(setCompany({ id: result.account.id, name: result.account.businessName, ...result.account }));
      }
      if (Array.isArray(result.modules)) {
        dispatch(setEnabledModules(result.modules));
      }
      dispatch(setSettings(loadPlatformSettings()));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(error.message || "Register yakunlanmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Yangi kompaniya workspace"
      subtitle="Registerdan keyin account, owner user va toza ERP workspace avtomatik yaratiladi."
      footer={
        <>
          Account bormi? <Link to="/login">Login</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {serverError && <div className="auth-form__error">{serverError}</div>}

        <div className="auth-form__section">
          <span>Business</span>
          <div className="auth-form__grid">
            <Input
              label="Kompaniya / biznes nomi"
              value={values.businessName}
              error={errors.businessName}
              autoComplete="organization"
              onChange={(event) => updateValue("businessName", event.target.value)}
              required
            />
            <Input
              label="Business type"
              value={values.businessType}
              autoComplete="organization-title"
              onChange={(event) => updateValue("businessType", event.target.value)}
            />
            <Input
              label="Country"
              value={values.country}
              autoComplete="country-name"
              onChange={(event) => updateValue("country", event.target.value)}
            />
            <label className="auth-form__select">
              <span>Currency</span>
              <select value={values.currency} onChange={(event) => updateValue("currency", event.target.value)}>
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>
        </div>

        <div className="auth-form__section">
          <span>Owner</span>
          <div className="auth-form__grid">
            <Input
              label="Owner full name"
              value={values.fullName}
              error={errors.fullName}
              autoComplete="name"
              onChange={(event) => updateValue("fullName", event.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={values.email}
              error={errors.email}
              autoComplete="email"
              onChange={(event) => updateValue("email", event.target.value)}
              required
            />
            <Input
              label="Telefon"
              value={values.phone}
              error={errors.phone}
              autoComplete="tel"
              onChange={(event) => updateValue("phone", event.target.value)}
              required
            />
            <div />
            <PasswordField
              id="register-password"
              name="password"
              label="Password"
              value={values.password}
              error={errors.password}
              autoComplete="new-password"
              onChange={(event) => updateValue("password", event.target.value)}
            />
            <PasswordField
              id="register-confirm-password"
              name="confirmPassword"
              label="Confirm password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              autoComplete="new-password"
              onChange={(event) => updateValue("confirmPassword", event.target.value)}
            />
          </div>
          <div className="auth-form__strength" data-score={strength}>
            <i />
            <i />
            <i />
            <i />
            <small>{strength >= 3 ? "Parol yaxshi" : "Parolni kuchaytiring"}</small>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!isValid}
          leftIcon={isValid ? <CheckCircle2 size={18} /> : <Building2 size={18} />}
        >
          Workspace yaratish
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
