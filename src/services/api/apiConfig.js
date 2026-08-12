export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api",

  timeout: 30000,

  headers: {
    accept: "application/json",
    contentType: "application/json",
  },
};