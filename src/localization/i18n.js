import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LOCALES,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
} from "./languages";
import {
  structuredTranslations,
  tajikPhraseMap,
  tajikWordReplacements,
  terminologyTranslations,
} from "./translations";
import { customerAgentTajikOverrides } from "./customerAgentOverrides";
import { productPurchaseTajikOverrides } from "./productPurchaseOverrides";

let currentLanguage = DEFAULT_LANGUAGE;
let currentTerminology = {};

const TAJIK_SAFE_TEXT_MAP = {
  "Amallar": "Амалҳо",
  "Faol": "Фаъол",
  "Faol emas": "Ғайрифаъол",
  "Qo'shish": "Илова кардан",
  "Ortga": "Бозгашт",
  "Bekor qilish": "Бекор кардан",
  "Tozalash": "Тоза кардан",
  "Yopish": "Пӯшидан",
  "Tasdiqlash": "Тасдиқ кардан",
  "O'chirish": "Нест кардан",
  "Tahrirlash": "Таҳрир",
  "Ma'lumot topilmadi.": "Маълумот ёфт нашуд.",
  "Xatolik yuz berdi": "Хатогӣ рух дод",
  "Yangi": "Нав",
  "Ma'lumot mavjud emas": "Маълумот нест",
  "Standartga qaytarish": "Ба стандарт баргардондан",
  "Saqlash": "Сабт кардан",
  "Qidirish": "Ҷустуҷӯ",
  "Holat": "Ҳолат",
  "Jami": "Ҳамагӣ",
  "Ko'rish": "Дидан",
  "Agentlar": "Агентҳо",
  "Mijozlar": "Мизоҷон",
  "Bosh sahifa": "Саҳифаи асосӣ",
  "Xodimlar": "Кормандон",
  "Moliya": "Молия",
  "Ishlab chiqarish": "Истеҳсолот",
  "Mahsulotlar": "Маҳсулотҳо",
  "Xaridlar": "Харидҳо",
  "Hisobotlar": "Ҳисоботҳо",
  "Savdo": "Фурӯш",
  "Sozlamalar": "Танзимот",
  "Yetkazib beruvchilar": "Таъминкунандагон",
  "Ombor": "Анбор",
  "Mahsulot": "Маҳсулот",
  "Mijoz": "Мизоҷ",
  "Xodim": "Корманд",
  "Qarz": "Қарз",
  "Kirim": "Воридот",
  "Chiqim": "Хароҷот",
  "Kassa": "Хазина",
  "To'lov": "Пардохт",
  "Avans": "Пешпардохт",
  "Bonus": "Бонус",
  "Jarima": "Ҷарима",
  "Davomat": "Ҳозиршавӣ",
  "Smena": "Смена",
  "Miqdor": "Миқдор",
  "Narx": "Нарх",
  "Chegirma": "Тахфиф",
  "Naqd": "Нақд",
  "Karta": "Корт",
  "Chek": "Чек",
  "Chop etish": "Чоп кардан",
  "Qaytarish": "Баргардонидан",
  "Telefon": "Телефон",
  "Sana": "Сана",
  "Kategoriya": "Категория",
  "Turi": "Навъ",
  "Qoldiq": "Боқимонда",
  "Sotuv narxi": "Нархи фурӯш",
  "Mavjud": "Мавҷуд",
  "Topilmadi": "Ёфт нашуд",
  "so'm": "сомонӣ",
  "Live": "Зинда",
  "Finance IN": "Молияи воридотӣ",
  "IN - OUT": "Воридот - хароҷот",
  "risk": "хатар",
  "Low stock": "Қолимонда кам",
  "Supplier qarzi": "Қарзи таъминкунанда",
  "Yetkazib beruvchi": "Таъминкунанда",
  "tugagan": "тамомшуда",
};

const isMojibake = (value) =>
  /\u0420[\u0400-\u04ff]\u0420|\u0421[\u0400-\u04ff]|\u0432\u0402|\?{2,}/.test(
    String(value),
  );

const WINDOWS_1251_EXTENDED =
  "ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—�™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя";

const repairMojibake = (value) => {
  const source = String(value ?? "");

  if (!isMojibake(source) || typeof TextDecoder === "undefined") {
    return source;
  }

  const bytes = [];

  for (const character of source) {
    const code = character.charCodeAt(0);
    const extendedIndex = WINDOWS_1251_EXTENDED.indexOf(character);
    const byte =
      code <= 0x7f
        ? code
        : extendedIndex >= 0
          ? extendedIndex + 0x80
          : null;

    if (byte === null) {
      return source;
    }

    bytes.push(byte);
  }

  try {
    const repaired = new TextDecoder().decode(Uint8Array.from(bytes));

    return isMojibake(repaired) ? source : repaired;
  } catch {
    return source;
  }
};

const TEXT_ATTRIBUTES = [
  "aria-label",
  "placeholder",
  "title",
  "alt",
  "data-empty-text",
];

const INTERNAL_TEXT_PATTERN =
  /^(ui-|header__|dashboard-|product-|purchase-|sales-|warehouse-|settings-|hr-|finance-|agent-|customer-|supplier-|manufacturing-|modal-|table-|btn-|icon-|[a-z0-9_-]+__|[a-z0-9_-]+--|#[a-f0-9]{3,8}$)/i;

const ENUM_PATTERN = /^[A-Z0-9_/-]{2,}$/;

const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9_-]+)+$/;

const normalizeVisibleText = (value) =>
  String(value ?? "")
    .replace(/\u0412\u00b7/g, "•")
    .replace(/\u0432\u0402\u201d/g, "—")
    .replace(/\s+/g, " ")
    .trim();

const shouldSkipText = (value) => {
  const text = normalizeVisibleText(value);

  return (
    !text ||
    INTERNAL_TEXT_PATTERN.test(text) ||
    KEY_PATTERN.test(text) ||
    ENUM_PATTERN.test(text) ||
    text.startsWith("/") ||
    text.includes("://") ||
    text.includes("@") ||
    text.length > 240
  );
};

const resolvePath = (object, path) =>
  String(path)
    .split(".")
    .reduce((result, part) => result?.[part], object);

export const getCurrentLanguage = () => currentLanguage;

export const getLocale = (language = currentLanguage) =>
  LANGUAGE_LOCALES[normalizeLanguage(language)] || LANGUAGE_LOCALES.uz;

export const getStoredLanguage = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

export const setStoredLanguage = (language) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
};

export const setCurrentLanguage = (language) => {
  currentLanguage = normalizeLanguage(language);
  setStoredLanguage(currentLanguage);
};

export const setCurrentTerminology = (terminology = {}) => {
  currentTerminology =
    terminology && typeof terminology === "object" ? terminology : {};
};

export const t = (key, options = {}) => {
  const language = normalizeLanguage(options.language || currentLanguage);
  const translated =
    resolvePath(structuredTranslations[language], key) ??
    resolvePath(structuredTranslations.uz, key) ??
    key;

  return interpolate(repairMojibake(translated), options.values);
};

export const tTerm = (key, options = {}) => {
  const language = normalizeLanguage(options.language || currentLanguage);
  const custom = options.terminology?.[key] ?? currentTerminology[key];

  if (custom) {
    return repairMojibake(custom);
  }

  return repairMojibake(
    terminologyTranslations[language]?.[key] ||
    terminologyTranslations.uz?.[key] ||
    key,
  );
};

export const translateText = (value, options = {}) => {
  const language = normalizeLanguage(options.language || currentLanguage);
  const source = normalizeVisibleText(value);

  if (!source || language === "uz") {
    return source;
  }

  const exact =
    customerAgentTajikOverrides[source] ||
    productPurchaseTajikOverrides[source] ||
    tajikPhraseMap[source];

  if (TAJIK_SAFE_TEXT_MAP[source]) {
    return repairMojibake(TAJIK_SAFE_TEXT_MAP[source]);
  }

  if (exact) {
    return repairMojibake(exact);
  }

  const dynamic = translateDynamicTajikText(source);

  if (dynamic) {
    return dynamic;
  }

  if (shouldSkipText(source)) {
    return source;
  }

  let translated = source;

  tajikWordReplacements.forEach(([uz, tj]) => {
    translated = translated.replaceAll(uz, repairMojibake(tj));
  });

  translated = translated
    .replace(/(\d+)\s+ta\b/g, "$1 адад")
    .replace(/(\d+)\s+та\b/g, "$1 адад")
    .replace(/\bso['‘]m\b/gi, "сум")
    .replace(/\bLow stock\b/g, "Қолдиқ кам")
    .replace(/\bNo data\b/g, "Маълумот нест")
    .replace(/\bNothing found\b/g, "Ҳеҷ чиз ёфт нашуд")
    .replace(/\bCustomer created\b/g, "Мизоҷ сохта шуд")
    .replace(/\bSupplier qarzi\b/g, "Қарз ба таъминкунандагон");

  return repairMojibake(translated);
};

const translateDynamicTajikText = (source) => {
  const patterns = [
    [
      /^Omborda yetarli qoldiq yo['‘]q\. Mavjud: (.+)$/i,
      "Дар анбор боқимонда кофӣ нест. Мавҷуд: $1",
    ],
    [
      /^Manba omborda yetarli qoldiq yo['‘]q\. Mavjud: (.+)$/i,
      "Дар анбори манбаъ боқимонда кофӣ нест. Мавҷуд: $1",
    ],
    [
      /^Omborda faqat (.+) mavjud\.$/i,
      "Дар анбор танҳо $1 мавҷуд аст.",
    ],
    [
      /^Manba omborda faqat (.+) mavjud\.$/i,
      "Дар анбори манбаъ танҳо $1 мавҷуд аст.",
    ],
    [
      /^(.+): real sarf noto['‘]g['‘]ri\.$/i,
      "$1: масрафи воқеӣ нодуруст аст.",
    ],
    [
      /^(.+) omborda topilmadi\.$/i,
      "$1 дар анбор ёфт нашуд.",
    ],
    [
      /^(.+): ombordagi qoldiq real sarf uchun yetarli emas\.$/i,
      "$1: боқимондаи анбор барои масрафи воқеӣ кофӣ нест.",
    ],
    [
      /^"(.+)" bosqichi tugatilmagan\.$/i,
      "Марҳилаи \"$1\" анҷом нашудааст.",
    ],
    [
      /^Ishlab chiqarish (.+)$/i,
      "Истеҳсолот $1",
    ],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(source)) {
      return source.replace(pattern, replacement);
    }
  }

  return "";
};

export const translateOptions = (options = []) =>
  options.map((option) => ({
    ...option,
    label: translateText(option.label),
  }));

export const localizeDom = (root = document.body) => {
  if (typeof document === "undefined" || !root) {
    return;
  }

  if (currentLanguage === "uz") {
    restoreUzDom(root);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }

      if (["SCRIPT", "STYLE", "CODE", "KBD", "PRE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }

      return shouldSkipText(node.nodeValue)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let node = walker.nextNode();

  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  nodes.forEach((textNode) => {
    const original =
      textNode.parentElement?.dataset?.i18nSourceText || textNode.nodeValue;
    const translated = translateText(original);

    if (translated !== normalizeVisibleText(textNode.nodeValue)) {
      textNode.parentElement.dataset.i18nSourceText = normalizeVisibleText(original);
      textNode.nodeValue = translated;
    }
  });

  TEXT_ATTRIBUTES.forEach((attribute) => {
    root.querySelectorAll?.(`[${attribute}]`)?.forEach((element) => {
      const original =
        element.dataset?.[`i18n${toDatasetName(attribute)}Source`] ||
        element.getAttribute(attribute);
      const translated = translateText(original);

      if (translated !== normalizeVisibleText(element.getAttribute(attribute))) {
        element.dataset[`i18n${toDatasetName(attribute)}Source`] =
          normalizeVisibleText(original);
        element.setAttribute(attribute, translated);
      }
    });
  });
};

const restoreUzDom = (root) => {
  root.querySelectorAll?.("[data-i18n-source-text]")?.forEach((element) => {
    if (element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE) {
      element.firstChild.nodeValue = element.dataset.i18nSourceText;
    }
  });

  TEXT_ATTRIBUTES.forEach((attribute) => {
    root.querySelectorAll?.(`[${toDatasetAttribute(attribute)}]`)?.forEach(
      (element) => {
        const source = element.dataset[`i18n${toDatasetName(attribute)}Source`];

        if (source) {
          element.setAttribute(attribute, source);
        }
      },
    );
  });
};

export const installBrowserLocalization = () => {
  if (typeof window === "undefined" || window.__universalErpI18nInstalled) {
    return;
  }

  window.__universalErpI18nInstalled = true;

  ["alert", "confirm", "prompt"].forEach((method) => {
    const original = window[method];

    if (typeof original !== "function") {
      return;
    }

    window[method] = (message, ...rest) =>
      original.call(window, translateText(message), ...rest);
  });
};

const interpolate = (text, values = {}) =>
  Object.entries(values || {}).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    text,
  );

const toDatasetName = (attribute) =>
  attribute
    .replace(/^data-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toDatasetAttribute = (attribute) =>
  `data-i18n-${attribute.replace(/^data-/, "")}-source`;
