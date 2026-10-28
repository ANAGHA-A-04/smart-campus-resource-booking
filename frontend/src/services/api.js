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

    // Redirect to login on 401 (but not on login page itself)
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
