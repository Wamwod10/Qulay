import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../../../../shared/ui/Button/Button";
import Input from "../../../../shared/ui/Input/Input";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import PasswordField from "../../components/PasswordField/PasswordField";
import authService from "../../services/authService";

import "../authPages.scss";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const valid = values.email.trim() && values.newPassword.length >= 8 && /[A-Za-z]/.test(values.newPassword) && /\d/.test(values.newPassword) && values.newPassword === values.confirmPassword;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    try {
      await authService.resetPassword(values);
      navigate("/login", { replace: true, state: { message: "Parol yangilandi. Yangi parol bilan kiring." } });
    } catch (resetError) {
      setError(resetError.message || "Parol yangilanmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Parolni tiklash"
      subtitle="Email, yangi parol va tasdiq parolini kiriting. Bu hozircha soddalashtirilgan MVP oqimi."
      footer={<Link to="/login">Kirish sahifasiga qaytish</Link>}
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="auth-form__error">{error}</div>}
        <Input label="Email" value={values.email} autoComplete="email" leftIcon={<Mail size={17} />} onChange={(event) => update("email", event.target.value)} required />
        <PasswordField id="reset-password" name="newPassword" label="Yangi parol" value={values.newPassword} autoComplete="new-password" onChange={(event) => update("newPassword", event.target.value)} />
        <PasswordField id="reset-confirm-password" name="confirmPassword" label="Yangi parolni tasdiqlang" value={values.confirmPassword} autoComplete="new-password" onChange={(event) => update("confirmPassword", event.target.value)} />
        <Button type="submit" fullWidth loading={loading} disabled={!valid} leftIcon={loading ? <KeyRound size={18} /> : <CheckCircle2 size={18} />}>Parolni yangilash</Button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
