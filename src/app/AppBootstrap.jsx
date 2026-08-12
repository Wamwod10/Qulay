import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { setAuthInitialized } from "../store/slices/authSlice";
import { setGlobalLoading } from "../store/slices/appSlice";

const AppBootstrap = ({ children }) => {
  const dispatch = useDispatch();

  const isAuthInitialized = useSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        dispatch(setGlobalLoading(true));

        // Hozircha development mode.
        // Backend ulanganda shu yerda:
        //
        // 1. /auth/me
        // 2. current company
        // 3. branches
        // 4. warehouses
        // 5. permissions
        // 6. enabled modules
        //
        // yuklanadi.

        if (!isAuthInitialized) {
          dispatch(setAuthInitialized(true));
        }
      } catch (error) {
        console.error("App bootstrap error:", error);
      } finally {
        dispatch(setGlobalLoading(false));
      }
    };

    bootstrap();
  }, [dispatch, isAuthInitialized]);

  return children;
};

export default AppBootstrap;
