import api from './api.js';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const resourceService = {
  getAll: (params) => api.get('/resources', { params }),
  getById: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.patch(`/resources/${id}`, data),
  updateStatus: (id, status) => api.patch(`/resources/${id}/status`, { status }),
  getAvailability: (id, params) => api.get(`/resources/${id}/availability`, { params }),
  getTimetable: (id) => api.get(`/resources/${id}/timetable`),
  createTimetableEntry: (id, data) => api.post(`/resources/${id}/timetable`, data),
  getBlocks: (id) => api.get(`/resources/${id}/blocks`),
  createBlock: (id, data) => api.post(`/resources/${id}/blocks`, data),
};

export const bookingService = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: (params) => api.get('/bookings/my', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, data) => api.post(`/bookings/${id}/cancel`, data),
  getAdminBookings: (params) => api.get('/bookings/admin/all', { params }),
};

export const adminService = {
  updateTimetableEntry: (id, data) => api.patch(`/admin/timetable/${id}`, data),
  deleteTimetableEntry: (id) => api.delete(`/admin/timetable/${id}`),
  updateBlock: (id, data) => api.patch(`/admin/blocks/${id}`, data),
  deleteBlock: (id) => api.delete(`/admin/blocks/${id}`),
};

export const studentRosterService = {
  getStudents: (params) => api.get('/admin/students', { params }),
  addStudent: (data) => api.post('/admin/students', data),
  uploadCsv: (formData) => api.post('/admin/students/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateStatus: (id, eligibilityStatus) => api.patch(`/admin/students/${id}/status`, { eligibilityStatus }),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  downloadTemplate: () => api.get('/admin/students/template', { responseType: 'blob' }),
};
