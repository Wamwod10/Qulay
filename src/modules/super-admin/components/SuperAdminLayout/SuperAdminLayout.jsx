import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { translateText } from "../../../../localization/i18n";
import authService from "../../../auth/services/authService";
import { logout } from "../../../../store/slices/authSlice";
import { SUPER_ADMIN_ROLE } from "../../../../constants/auth";

import "./SuperAdminLayout.scss";

const NAVIGATION = [
  { label: "Bosh sahifa", icon: LayoutDashboard, path: "/superadmin", end: true },
  { label: "Foydalanuvchilar", icon: Users, path: "/superadmin/users" },
  { label: "Kompaniyalar", icon: Building2, path: "/superadmin/companies" },
  { label: "Bo'limlar", icon: Settings2, path: "/superadmin/modules" },
  { label: "Audit", icon: Activity, path: "/superadmin/audit-logs" },
];

const SuperAdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <div className="super-admin-layout">
      <aside className="super-admin-layout__sidebar">
        <div className="super-admin-layout__brand">
          <div className="super-admin-layout__brand-icon">
            <ShieldCheck size={21} />
          </div>

          <div>
            <strong>{translateText("Platforma boshqaruvchisi")}</strong>
            <span>{translateText("Platforma boshqaruvi")}</span>
          </div>
        </div>

        <nav className="super-admin-layout__nav">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "super-admin-layout__nav-item",
                    isActive ? "super-admin-layout__nav-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <Icon size={18} />
                <span>{translateText(item.label)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="super-admin-layout__bottom">
          <button type="button" onClick={handleLogout}>
            <LogOut size={17} />
            {translateText("Chiqish")}
          </button>
        </div>
      </aside>

      <main className="super-admin-layout__main">
        <header className="super-admin-layout__header">
          <div>
            <span>{translateText("Platforma boshqaruvchisi")}</span>
            <strong>{translateText("Platforma nazorati")}</strong>
          </div>

          <div className="super-admin-layout__profile">
            <div>SA</div>

            <span>
              <strong>{translateText("Platforma boshqaruvchisi")}</strong>
              <small>{SUPER_ADMIN_ROLE}</small>
            </span>
          </div>
        </header>

        <div className="super-admin-layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
