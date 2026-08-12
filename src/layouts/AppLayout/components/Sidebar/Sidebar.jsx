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

import { navigationItems } from "../../../../config/navigation.config";
import useModuleAccess from "../../../../hooks/useModuleAccess";

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

  const visibleItems = navigationItems.filter(
    (item) => !item.module || hasModule(item.module),
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          U
        </div>

        <div className="sidebar__brand-text">
          <strong>Universal</strong>
          <span>Business OS</span>
        </div>
      </div>

      <nav className="sidebar__navigation">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <NavLink
              key={item.id}
              to={item.path}
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