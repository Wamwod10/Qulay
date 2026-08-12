export const getApiErrorMessage = (error) => {
  if (!error) {
    return "Noma’lum xatolik yuz berdi.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.data?.message) {
    if (Array.isArray(error.data.message)) {
      return error.data.message.join(", ");
    }

    return error.data.message;
  }

  if (error?.error) {
    return error.error;
  }

  switch (error?.status) {
    case 400:
      return "So‘rov noto‘g‘ri yuborildi.";

    case 401:
      return "Avtorizatsiya talab qilinadi.";

    case 403:
      return "Bu amal uchun ruxsat mavjud emas.";

    case 404:
      return "Ma’lumot topilmadi.";

    case 409:
      return "Ma’lumotlar o‘rtasida ziddiyat mavjud.";

    case 422:
      return "Kiritilgan ma’lumotlarni tekshiring.";

    case 500:
      return "Serverda xatolik yuz berdi.";

    default:
      return "So‘rovni bajarishda xatolik yuz berdi.";
  }
};