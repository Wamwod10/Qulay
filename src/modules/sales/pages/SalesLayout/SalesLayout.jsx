import { NavLink, Outlet } from "react-router-dom";

import { History, Monitor } from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import "./SalesLayout.scss";

const SalesLayout = () => {
  const tabs = [
    {
      to: "/sales/terminal",
      label: "POS Terminal",
      icon: <Monitor size={16} />,
    },
    {
      to: "/sales/history",
      label: "Savdo ro'yxati",
      icon: <History size={16} />,
    },
  ];

  return (
    <PageContainer
      title="Savdo"
      description="POS terminal va backoffice savdo boshqaruvi bitta localStorage data bilan ishlaydi."
    >
      <div className="sales-layout">
        <nav className="sales-layout__switcher" aria-label="Sales mode">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  "sales-layout__switcher-item",
                  isActive ? "sales-layout__switcher-item--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </PageContainer>
  );
};

export default SalesLayout;
