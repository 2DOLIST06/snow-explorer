import axios from "axios";
import { ADMIN_API_BASE, getAdminCsrfToken, notifyAdminExpired, refreshAdminSession } from "@/lib/adminApi";

const instance = axios.create({
  baseURL: ADMIN_API_BASE,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
instance.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getAdminCsrfToken();
    if (csrf) config.headers.set("X-CSRF-Token", csrf);
  }
  return config;
});
instance.interceptors.response.use(undefined, async (error) => {
  if (error?.response?.status === 401) notifyAdminExpired();
  const config = error?.config;
  const code = String(error?.response?.data?.code || error?.response?.data?.error || "").toLowerCase();
  if (error?.response?.status === 403 && code.includes("csrf") && config && !config._csrfRetried) {
    config._csrfRetried = true;
    if (await refreshAdminSession()) return instance.request(config);
  } else if (error?.response?.status === 403 && code.includes("csrf") && config?._csrfRetried) notifyAdminExpired();
  return Promise.reject(error);
});

export default instance;
