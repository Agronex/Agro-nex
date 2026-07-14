const FALLBACK_BACKEND_URL = "https://agro-nex.onrender.com";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? FALLBACK_BACKEND_URL : "http://localhost:5000");
