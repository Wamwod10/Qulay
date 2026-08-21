import {
  ChartNoAxesCombined,
  Factory,
  LayoutDashboard,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Truck,
  UserRoundCog,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

import { navigationItems } from "../../../../config/navigation.config";
import usePermissions from "../../../../hooks/usePermissions";
import useModuleAccess from "../../../../hooks/useModuleAccess";
import { tenantSet } from "../../../../modules/auth/utils/tenantStorage";
import { mergeNavigationSettings } from "../../../../modules/settings/utils/moduleSettingsHelpers";

import "./Sidebar.scss";

const iconMap = {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Warehouse,
  PackagePlus,
  Package,
  Users,
  Truck,
  WalletCards,
  UserRoundCog,
  ChartNoAxesCombined,
  Settings,
};

const Sidebar = () => {
  const { hasModule } = useModuleAccess();
  const { can } = usePermissions();
  const userRole = useSelector((state) => state.auth.user?.role);
  const modules = useSelector((state) => state.settings.modules);
  const terminology = useSelector((state) => state.settings.terminology);
  const language = useSelector((state) => state.settings.formats?.language);
  const rememberLastOpenedModule = useSelector(
    (state) => state.settings.behavior?.rememberLastOpenedModule,
  );

  const fullSettingsAccess = userRole === "OWNER" || userRole === "ADMIN";

  const visibleItems = mergeNavigationSettings({
    items: navigationItems,
    modules,
    terminology,
    language,
  }).filter((item) => {
    const hidden = item.id === "settings" && fullSettingsAccess ? false : item.hidden;

    return !hidden && (!item.module || hasModule(item.module)) && can(item.permission);
  });

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          U
        </div>

        <div className="sidebar__brand-text">
          <strong>Universal</strong>
          <span>Biznes tizimi</span>
        </div>
      </div>

      <nav className="sidebar__navigation">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => {
                if (rememberLastOpenedModule) {
                  tenantSet("last_module", item.id);
                }
              }}
              className={({ isActive }) =>
                [
                  "sidebar__item",
                  isActive
                    ? "sidebar__item--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {Icon && (
                <Icon
                  className="sidebar__item-icon"
                  size={20}
                  strokeWidth={1.8}
                />
              )}

              <span className="sidebar__item-label">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
