import StoreProvider from "./providers/StoreProvider";
import LocalizationProvider from "./providers/LocalizationProvider";

import AppBootstrap from "./AppBootstrap";

import SettingsRuntime from "../modules/settings/components/SettingsRuntime/SettingsRuntime";

const AppProviders = ({ children }) => {
  return (
    <StoreProvider>
      <LocalizationProvider>
        <SettingsRuntime>
          <AppBootstrap>{children}</AppBootstrap>
        </SettingsRuntime>
      </LocalizationProvider>
    </StoreProvider>
  );
};

export default AppProviders;
