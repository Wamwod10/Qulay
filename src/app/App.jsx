import AppRouter from "../routes/AppRouter";
import { useEffect } from "react";

import GlobalLoader from "../components/GlobalLoader/GlobalLoader";
import OfflineBanner from "../components/OfflineBanner/OfflineBanner";

import useAppLoading from "../hooks/useAppLoading";

const App = () => {
  const isLoading = useAppLoading();

  useEffect(() => {
    const preventWheelChange = (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number" && document.activeElement === event.target) {
        event.preventDefault();
      }
    };
    document.addEventListener("wheel", preventWheelChange, { passive: false });
    return () => document.removeEventListener("wheel", preventWheelChange);
  }, []);

  if (isLoading) {
    return <GlobalLoader />;
  }

  return (
    <>
      <OfflineBanner />
      <AppRouter />
    </>
  );
};

export default App;
