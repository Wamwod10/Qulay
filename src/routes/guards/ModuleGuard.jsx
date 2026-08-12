import { Navigate, Outlet } from "react-router-dom";

import useModuleAccess from "../../hooks/useModuleAccess";

const ModuleGuard = ({ module }) => {
  const { hasModule } = useModuleAccess();

  if (!hasModule(module)) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
};

export default ModuleGuard;