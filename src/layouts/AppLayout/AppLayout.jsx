import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

import Header from "./components/Header/Header";
import Sidebar from "./components/Sidebar/Sidebar";
import { SUPER_ADMIN_ROLE } from "../../constants/auth";

import "./AppLayout.scss";

const AppLayout = () => {
  const role = useSelector((state) => state.auth.user?.role);

  if (role === SUPER_ADMIN_ROLE) {
    return <Navigate to="/superadmin" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-layout__main">
        <Header />

        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
