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
    server: "Server bilan aloqa o'rnatilmadi. Qayta urinib ko'ring.",
  },
  tj: {
    unknown: "Амал иҷро нашуд. Лутфан аз нав кӯшиш кунед.",
    unauthorized: "Сессия ба охир расид. Аз нав ворид шавед.",
    forbidden: "Барои ин амал иҷозат нест.",
    module: "Ин бахш ҳоло дастрас нест.",
    notFound: "Маълумот ёфт нашуд.",
    conflict: "Ин қимат аллакай вуҷуд дорад.",
    validation: "Маълумоти воридшударо санҷед.",
    server: "Бо сервер пайваст шудан имкон нашуд. Аз нав кӯшиш кунед.",
  },
};

const getResponseMessage = (error) => {
  const message = error?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message;
};

const isGenericMessage = (message) =>
  !message || /^(server xatosi|server error|database|amalni bajarib bo'lmadi)/i.test(message);

export const getApiErrorMessage = (error) => {
  const messages = MESSAGES[getCurrentLanguage() === "tj" ? "tj" : "uz"];
  if (!error) return messages.unknown;
  if (typeof error === "string") {
    if (/P2002|duplicate|already exists|allaqachon mavjud/i.test(error)) return messages.conflict;
    if (/P2025|not found|topilmadi/i.test(error)) return messages.notFound;
    if (/Server xatosi|Server error|Database/i.test(error)) return messages.unknown;
    return error;
  }

  const status = error?.status || error?.statusCode;
  const code = error?.code || error?.data?.code;

  if (code === "MODULE_DISABLED") return messages.module;
  if (["INTERNAL_SERVER_ERROR", "DATABASE_OPERATION_FAILED", "API_UNAVAILABLE"].includes(code)) return messages.server;
  if (code === "PRODUCT_NOT_FOUND") return "Mahsulot topilmadi.";
  if (code === "SUPPLIER_NOT_FOUND") return "Yetkazib beruvchi topilmadi.";
  if (code === "WAREHOUSE_NOT_FOUND") return "Ombor topilmadi.";
  if (code === "PURCHASE_LOCKED") return "Qabul qilingan xarid tahrirlanmaydi.";
  if (code === "OVERPAYMENT") return "To'lov qarz summasidan oshmasin.";
  if (code === "DUPLICATE_RECEIVE") return "Qabul miqdori qoldiqdan oshmasin.";
  if (code === "PURCHASE_NOT_RECEIVED") return "Avval xaridni qabul qiling.";
  if (code === "PURCHASE_RECEIVED") return "Qabul qilingan xarid bekor qilinmaydi.";
  if (code === "UNIT_DIMENSION_MISMATCH") return "Har xil o'lchov turidagi birliklarni aralashtirib bo'lmaydi.";

  if (status === 401) return messages.unauthorized;
  if (status === 403 && ["ACCOUNT_BLOCKED", "COMPANY_BLOCKED", "TENANT_REQUIRED"].includes(code)) {
    return getResponseMessage(error) || messages.forbidden;
  }
  if (status === 403) return messages.forbidden;

  const responseMessage = getResponseMessage(error);
  if (responseMessage && !isGenericMessage(responseMessage)) return responseMessage;
  if (status === 409) return messages.conflict;
  if (status === 500 || status === 503) return messages.server;
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
