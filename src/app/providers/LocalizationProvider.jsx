import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { updateFormats } from "../../store/slices/settingsSlice";
import {
  getLocale,
  getStoredLanguage,
  installBrowserLocalization,
  localizeDom,
  setCurrentLanguage,
  setCurrentTerminology,
} from "../../localization/i18n";
import { normalizeLanguage } from "../../localization/languages";
import {
  selectFormatSettings,
  selectTerminologySettings,
} from "../../modules/settings/selectors/settingsSelectors";

const LocalizationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const formats = useSelector(selectFormatSettings);
  const terminology = useSelector(selectTerminologySettings);
  const language = normalizeLanguage(formats.language || getStoredLanguage());

  useEffect(() => {
    installBrowserLocalization();
  }, []);

  useEffect(() => {
    if (formats.language !== language) {
      dispatch(updateFormats({ language }));
    }
  }, [dispatch, formats.language, language]);

  useEffect(() => {
    setCurrentLanguage(language);
    setCurrentTerminology(terminology);

    document.documentElement.lang = language === "tj" ? "tg" : "uz";
    document.documentElement.dataset.language = language;
    document.documentElement.dataset.locale = getLocale(language);

    window.dispatchEvent(
      new CustomEvent("universal-erp:language-change", {
        detail: { language },
      }),
    );

    window.requestAnimationFrame(() => localizeDom(document.body));
  }, [language, terminology]);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") {
      return undefined;
    }

    let frameId = null;
    const pendingRoots = new Set();
    const scheduleLocalization = (mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          const target = mutation.target?.nodeType === Node.ELEMENT_NODE
            ? mutation.target
            : mutation.target?.parentElement;
          if (target) pendingRoots.add(target);
          return;
        }

        mutation.addedNodes?.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node);
        });
      });

      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const roots = [...pendingRoots];
        pendingRoots.clear();

        roots.forEach((root) => localizeDom(root));
      });
    };

    const observer = new MutationObserver(scheduleLocalization);

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title", "alt", "data-empty-text"],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      pendingRoots.clear();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return children;
};

export default LocalizationProvider;
