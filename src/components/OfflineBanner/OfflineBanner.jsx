import { useEffect, useState } from "react";

import { translateText } from "../../localization/i18n";

import "./OfflineBanner.scss";

const OfflineBanner = () => {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    const handleApiError = (event) => setApiError(event.detail?.message || "Server bilan bog'lanib bo'lmadi.");
    const handleApiOnline = () => setApiError("");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("erp:api-error", handleApiError);
    window.addEventListener("erp:api-online", handleApiOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("erp:api-error", handleApiError);
      window.removeEventListener("erp:api-online", handleApiOnline);
    };
  }, []);

  if (!offline && !apiError) {
    return null;
  }

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span>{translateText(offline ? "Internet aloqasi yo'q" : apiError)}</span>
      <button type="button" onClick={() => window.location.reload()}>
        {translateText("Qayta urinish")}
      </button>
    </div>
  );
};

export default OfflineBanner;
