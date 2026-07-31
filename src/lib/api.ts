import axios from "axios";
import { BASE_URL } from "@/app/_utils/constants";
import { routes } from "@/app/_utils/routes";
import { UserData } from "@/types";

const USER_STORAGE_KEY = "user";

function getStoredUser(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

// Anonymous ad-watch progress rides on a signed httpOnly `anon_session_id`
// cookie the backend sets automatically (API contract §3) — withCredentials
// is required for it to round-trip, for both logged-out and logged-in calls.
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const user = getStoredUser();
  if (user?.accessToken) {
    config.headers.Authorization = `Bearer ${user.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredUser();
      if (typeof window !== "undefined") {
        window.location.href = routes.LOGIN;
      }
    }
    return Promise.reject(error);
  }
);
