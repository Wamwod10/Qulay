import { Link } from "react-router-dom";

import "./AuthLayout.scss";

const AuthLayout = ({ title, subtitle, children, footer }) => (
  <main className="auth-shell">
    <section className="auth-shell__panel" aria-label={title}>
      <Link className="auth-shell__brand" to="/login">
        <span>UE</span>
        <div>
          <strong>Universal ERP</strong>
          <small>Premium POS va boshqaruv platformasi</small>
        </div>
      </Link>

      <div className="auth-shell__heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {children}

      {footer && <div className="auth-shell__footer">{footer}</div>}
    </section>
  </main>
);

export default AuthLayout;
