export const DEFAULT_LANGUAGE = "uz";

export const SUPPORTED_LANGUAGES = ["uz", "tj"];

export const LANGUAGE_STORAGE_KEY = "universal_erp_language";

export const LANGUAGE_OPTIONS = [
  { value: "uz", label: "UZ", title: "O'zbekcha" },
  { value: "tj", label: "TJ", title: "Тоҷикӣ" },
];

export const LANGUAGE_LOCALES = {
  uz: "uz-UZ",
  tj: "tg-TJ",
};

export const normalizeLanguage = (value) =>
  SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
