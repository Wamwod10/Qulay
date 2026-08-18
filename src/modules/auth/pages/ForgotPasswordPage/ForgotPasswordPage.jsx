import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { translateText } from "../../../../localization/i18n";

import "../authPages.scss";

const ForgotPasswordPage = () => (
  <AuthLayout
    title={translateText("Parolni tiklash")}
    subtitle={translateText("Hisobingiz xavfsizligi uchun parolni tiklash faqat tasdiqlangan token yoki OTP orqali amalga oshiriladi.")}
    footer={<Link to="/login">{translateText("Login sahifasiga qaytish")}</Link>}
  >
    <div className="auth-form">
      <div className="auth-form__notice" role="status">
        <ShieldAlert size={22} aria-hidden="true" />
        <div>
          <strong>{translateText("Parolni tiklash hozircha mavjud emas")}</strong>
          <p>{translateText("Tasdiqlangan email yoki SMS provider ulanmaguncha direct parol almashtirish bloklangan. Administratorga murojaat qiling.")}</p>
        </div>
      </div>

      <Link className="auth-form__link" to="/login">
        {translateText("Login sahifasiga qaytish")}
      </Link>
    </div>
  </AuthLayout>
);

export default ForgotPasswordPage;
