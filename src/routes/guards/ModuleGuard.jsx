import { Navigate, Outlet } from "react-router-dom";

import GlobalLoader from "../../components/GlobalLoader/GlobalLoader";
import useModuleAccess from "../../hooks/useModuleAccess";

const ModuleGuard = ({ module: moduleKey }) => {
  const { hasModule, isInitialized } = useModuleAccess();

  if (!isInitialized) {
    return <GlobalLoader />;
  }

  if (!hasModule(moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ModuleGuard;
