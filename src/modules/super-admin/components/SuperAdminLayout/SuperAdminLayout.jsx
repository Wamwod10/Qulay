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
import { translateText } from "../../../../localization/i18n";

import "./SuperAdminLayout.scss";

const NAVIGATION = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/superadmin",
    end: true,
  },
  {
    label: "Userlar",
    icon: Users,
    path: "/superadmin/users",
  },
  {
    label: "Kompaniyalar",
    icon: Building2,
    path: "/superadmin/companies",
  },
  {
    label: "Bo‘limlar",
    icon: Settings2,
    path: "/superadmin/modules",
  },
  {
    label: "Audit",
    icon: Activity,
    path: "/superadmin/audit-logs",
  },
];

const SuperAdminLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="super-admin-layout">
      <aside className="super-admin-layout__sidebar">
        <div className="super-admin-layout__brand">
          <div className="super-admin-layout__brand-icon">
            <ShieldCheck size={21} />
          </div>

          <div>
            <strong>{translateText("Super Admin")}</strong>
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
          <button type="button" onClick={() => navigate("/")}>
            <LogOut size={17} />
            {translateText("Platformaga qaytish")}
          </button>
        </div>
      </aside>

      <main className="super-admin-layout__main">
        <header className="super-admin-layout__header">
          <div>
            <span>{translateText("Super Admin")}</span>
            <strong>{translateText("Platforma nazorati")}</strong>
          </div>

          <div className="super-admin-layout__profile">
            <div>SA</div>

            <span>
              <strong>{translateText("Super Admin")}</strong>
              <small>SUPER_ADMIN</small>
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
