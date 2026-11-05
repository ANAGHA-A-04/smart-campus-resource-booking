import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token if stored (enables cross-domain deployment)
api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'An unexpected error occurred';

    const publicAuthPages = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

    if (
      error.response?.status === 401 &&
      !publicAuthPages.includes(window.location.pathname)
    ) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
