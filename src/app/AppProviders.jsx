import StoreProvider from "./providers/StoreProvider";
import AppBootstrap from "./AppBootstrap";

const AppProviders = ({ children }) => {
  return (
    <StoreProvider>
      <AppBootstrap>
        {children}
      </AppBootstrap>
    </StoreProvider>
  );
};

export default AppProviders;