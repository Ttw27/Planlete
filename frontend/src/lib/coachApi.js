import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const COACH_TOKEN_KEY = "planlete_coach_token";

export function getCoachToken() {
  return localStorage.getItem(COACH_TOKEN_KEY);
}

export function setCoachToken(token) {
  if (token) localStorage.setItem(COACH_TOKEN_KEY, token);
  else localStorage.removeItem(COACH_TOKEN_KEY);
}

export const coachApi = axios.create({
  baseURL: API,
  withCredentials: true,
});

coachApi.interceptors.request.use((config) => {
  const token = getCoachToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export function formatApiError(err, fallback = "Something went wrong") {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (d && typeof d.msg === "string") return d.msg;
  return JSON.stringify(d);
}
