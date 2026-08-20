import { getCurrentLanguage } from "../../localization/i18n";

const MESSAGES = {
  uz: {
    unknown: "Amalni bajarib bo'lmadi. Qayta urinib ko'ring.",
    unauthorized: "Sessiya tugagan. Qayta kiring.",
    forbidden: "Bu amal uchun ruxsat yo'q.",
    module: "Bu bo'lim hozircha o'chirilgan.",
    notFound: "Ma'lumot topilmadi.",
    conflict: "Bu qiymat allaqachon mavjud.",
    validation: "Kiritilgan ma'lumotlarni tekshiring.",
    server: "Amalni bajarib bo'lmadi. Qayta urinib ko'ring.",
  },
  tj: {
    unknown: "Амалиёт иҷро нашуд. Лутфан аз нав кӯшиш кунед.",
    unauthorized: "Сессия ба охир расид. Аз нав ворид шавед.",
    forbidden: "Барои ин амал иҷозат нест.",
    module: "Ин бахш ҳоло дастрас нест.",
    notFound: "Маълумот ёфт нашуд.",
    conflict: "Ин қимат аллакай вуҷуд дорад.",
    validation: "Маълумоти воридшударо санҷед.",
    server: "Амалиёт иҷро нашуд. Лутфан аз нав кӯшиш кунед.",
  },
};

const getResponseMessage = (error) => {
  const message = error?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message;
};

export const getApiErrorMessage = (error) => {
  const messages = MESSAGES[getCurrentLanguage() === "tj" ? "tj" : "uz"];
  if (!error) return messages.unknown;
  if (typeof error === "string") {
    if (/P2002|duplicate|already exists|allaqachon mavjud/i.test(error)) return messages.conflict;
    if (/P2025|not found|topilmadi/i.test(error)) return messages.notFound;
    if (/Server xatosi|Server error|Database/i.test(error)) return messages.unknown;
    return error;
  }
  if (error?.code === "MODULE_DISABLED") return messages.module;
  if (["INTERNAL_SERVER_ERROR", "DATABASE_OPERATION_FAILED", "API_UNAVAILABLE"].includes(error?.code)) return messages.server;

  const status = error?.status || error?.statusCode;
  const code = error?.code || error?.data?.code;
  if (status === 401 && ["UNAUTHENTICATED", "INVALID_TOKEN"].includes(code)) {
    return messages.unauthorized;
  }
  if (status === 403 && ["ACCOUNT_BLOCKED", "COMPANY_BLOCKED", "TENANT_REQUIRED"].includes(code)) {
    return getResponseMessage(error) || messages.forbidden;
  }
  if (status === 403) return messages.forbidden;
  if (status === 409) return messages.conflict;
  if (status === 500 || status === 503) return messages.server;

  const responseMessage = getResponseMessage(error);
  if (responseMessage) return responseMessage;
  if (error?.message && !/^Server xatosi|^Server error|^Database/i.test(error.message)) return error.message;

  switch (status) {
    case 400:
    case 422:
      return messages.validation;
    case 404:
      return messages.notFound;
    default:
      return messages.unknown;
  }
};
