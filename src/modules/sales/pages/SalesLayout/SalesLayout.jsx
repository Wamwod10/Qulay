import { NavLink, Outlet } from "react-router-dom";

import { History, Monitor } from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";
import { useTerminology } from "../../../settings/selectors/settingsSelectors";

import "./SalesLayout.scss";

const SalesLayout = () => {
  const { tTerm } = useTerminology();
  const tabs = [
    {
      to: "/sales/terminal",
      label: tTerm("pos"),
      icon: <Monitor size={16} />,
    },
    {
      to: "/sales/history",
      label: tTerm("salesHistory"),
      icon: <History size={16} />,
    },
  ];

  return (
    <PageContainer
      title={tTerm("sales")}
      description="POS terminal va backoffice savdo boshqaruvi real backend ma'lumotlari bilan ishlaydi."
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
