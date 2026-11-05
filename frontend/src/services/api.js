import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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
  window.location.href = '/login';
}

    return Promise.reject({ ...error, message });
  }
);

export default api;
