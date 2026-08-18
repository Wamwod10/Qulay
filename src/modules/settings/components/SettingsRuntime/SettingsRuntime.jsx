import { useEffect } from "react";

import {
  useAppearanceSettings,
  useFormatSettings,
} from "../../selectors/settingsSelectors";

const FONT_SCALES = {
  small: 0.9,
  standard: 1,
  large: 1.1,
  "extra-large": 1.2,
};

const RADIUS_PRESETS = {
  sharp: {
    "--radius-xs": "3px",
    "--radius-sm": "5px",
    "--radius-md": "7px",
    "--radius-lg": "9px",
    "--radius-xl": "12px",
    "--radius-2xl": "16px",
  },
  standard: {
    "--radius-xs": "6px",
    "--radius-sm": "10px",
    "--radius-md": "14px",
    "--radius-lg": "18px",
    "--radius-xl": "24px",
    "--radius-2xl": "30px",
  },
  rounded: {
    "--radius-xs": "8px",
    "--radius-sm": "14px",
    "--radius-md": "18px",
    "--radius-lg": "24px",
    "--radius-xl": "30px",
    "--radius-2xl": "38px",
  },
};

const SHADOW_PRESETS = {
  low: {
    "--shadow-raised":
      "6px 6px 14px rgba(163, 173, 184, 0.34), -6px -6px 14px rgba(255, 255, 255, 0.64)",
    "--shadow-raised-sm":
      "3px 3px 8px rgba(163, 173, 184, 0.30), -3px -3px 8px rgba(255, 255, 255, 0.62)",
  },
  normal: {
    "--shadow-raised":
      "10px 10px 24px rgba(163, 173, 184, 0.52), -10px -10px 24px rgba(255, 255, 255, 0.78)",
    "--shadow-raised-sm":
      "5px 5px 12px rgba(163, 173, 184, 0.45), -5px -5px 12px rgba(255, 255, 255, 0.72)",
  },
  strong: {
    "--shadow-raised":
      "14px 14px 30px rgba(139, 151, 165, 0.62), -14px -14px 30px rgba(255, 255, 255, 0.88)",
    "--shadow-raised-sm":
      "8px 8px 16px rgba(139, 151, 165, 0.54), -8px -8px 16px rgba(255, 255, 255, 0.80)",
  },
};

const DARK_SHADOW_PRESETS = {
  low: {
    "--shadow-raised":
      "8px 8px 18px rgba(4, 7, 12, 0.48), -4px -4px 10px rgba(45, 54, 66, 0.12)",
    "--shadow-raised-sm":
      "4px 4px 10px rgba(4, 7, 12, 0.42), -3px -3px 8px rgba(45, 54, 66, 0.10)",
  },
  normal: {
    "--shadow-raised":
      "12px 12px 26px rgba(4, 7, 12, 0.62), -8px -8px 18px rgba(45, 54, 66, 0.18)",
    "--shadow-raised-sm":
      "6px 6px 14px rgba(4, 7, 12, 0.54), -4px -4px 10px rgba(45, 54, 66, 0.16)",
  },
  strong: {
    "--shadow-raised":
      "16px 16px 34px rgba(4, 7, 12, 0.72), -8px -8px 18px rgba(45, 54, 66, 0.20)",
    "--shadow-raised-sm":
      "8px 8px 18px rgba(4, 7, 12, 0.64), -4px -4px 10px rgba(45, 54, 66, 0.18)",
  },
};

const CONTENT_WIDTHS = {
  fluid: "none",
  wide: "1920px",
  focused: "1280px",
};

const SIDEBAR_WIDTHS = {
  compact: "232px",
  normal: "264px",
};

const SettingsRuntime = ({ children }) => {
  const appearance = useAppearanceSettings();
  const formats = useFormatSettings();

  useEffect(() => {
    const root = document.documentElement;
    const systemDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme =
      appearance.theme === "system"
        ? systemDark
          ? "dark"
          : "light"
        : appearance.theme || "light";
    const scale =
      FONT_SCALES[appearance.fontSize] || Number(appearance.fontScale || 1);

    root.dataset.theme = theme;
    root.dataset.language = formats.language || "uz";
    root.lang = formats.language || "uz";
    root.style.setProperty("--app-font-scale", String(scale));
    root.style.setProperty("--font-size-xs", `${12 * scale}px`);
    root.style.setProperty("--font-size-sm", `${14 * scale}px`);
    root.style.setProperty("--font-size-md", `${16 * scale}px`);
    root.style.setProperty("--font-size-lg", `${18 * scale}px`);
    root.style.setProperty("--font-size-xl", `${20 * scale}px`);
    root.style.setProperty("--font-size-2xl", `${24 * scale}px`);
    root.style.setProperty("--font-size-3xl", `${30 * scale}px`);
    root.style.setProperty("--font-size-4xl", `${36 * scale}px`);

    root.style.setProperty(
      "--app-body-font-weight",
      String(appearance.bodyFontWeight || 400),
    );
    root.style.setProperty(
      "--app-heading-font-weight",
      String(appearance.headingFontWeight || 700),
    );
    root.style.setProperty(
      "--app-font-weight",
      String(appearance.bodyFontWeight || 400),
    );
    root.style.setProperty(
      "--app-heading-weight",
      String(appearance.headingFontWeight || 700),
    );
    root.style.setProperty(
      "--app-table-font-size",
      `${Number(appearance.tableFontSize) || 13}px`,
    );

    Object.entries(RADIUS_PRESETS[appearance.radiusScale] || RADIUS_PRESETS.standard)
      .forEach(([key, value]) => root.style.setProperty(key, value));

    const shadowPresets = theme === "dark" ? DARK_SHADOW_PRESETS : SHADOW_PRESETS;

    Object.entries(shadowPresets[appearance.shadowStrength] || shadowPresets.normal)
      .forEach(([key, value]) => root.style.setProperty(key, value));

    root.style.setProperty(
      "--sidebar-width",
      SIDEBAR_WIDTHS[appearance.sidebarWidth] || SIDEBAR_WIDTHS.normal,
    );
    root.style.setProperty(
      "--content-max-width",
      CONTENT_WIDTHS[appearance.contentMaxWidth] || CONTENT_WIDTHS.wide,
    );

    root.dataset.density = appearance.density || "normal";
    root.dataset.sidebarDefault = appearance.sidebarDefault || "expanded";
  }, [appearance, formats.language]);

  return children;
};

export default SettingsRuntime;
