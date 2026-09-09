import axios from 'axios';

/**
 * Central Axios instance.
 * Default baseURL `/api` works in dev (Vite proxy) and production
 * (Express serves the built app on the same origin).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_ADMIN_API_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Normalizes any thrown error into a readable message. */
export function getErrorMessage(error) {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the backend server. Is it running?';
  if (error?.message) return error.message;
  return 'An unexpected error occurred.';
}

export function getErrorCode(error) {
  return error?.response?.data?.error?.code || null;
}

export default api;
