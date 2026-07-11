import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('o2o-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (typeof window !== 'undefined') {
      const slug = localStorage.getItem('o2o-slug');

      if (error.response?.status === 401) {
        localStorage.removeItem('o2o-token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = slug ? `/gym/${slug}/login` : '/login';
        }
      }

      // 402 = gym platform subscription suspended — the slug layout shows
      // the suspension screen after re-resolving the gym status.
      if (error.response?.status === 402 && slug) {
        if (!window.location.pathname.endsWith(`/gym/${slug}`)) {
          window.location.href = `/gym/${slug}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message || error.message;
  }
  return 'An unexpected error occurred';
}
