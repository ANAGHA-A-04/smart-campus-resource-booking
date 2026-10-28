import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute.jsx';

// Auth Pages
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import VerifyOtpPage from './pages/auth/VerifyOtpPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import ResourceBrowsePage from './pages/student/ResourceBrowsePage.jsx';
import ResourceDetailPage from './pages/student/ResourceDetailPage.jsx';
import BookingPage from './pages/student/BookingPage.jsx';
import BookingSuccessPage from './pages/student/BookingSuccessPage.jsx';
import MyBookingsPage from './pages/student/MyBookingsPage.jsx';
import StudentProfilePage from './pages/student/StudentProfilePage.jsx';

// Department Admin Pages
import DeptDashboard from './pages/department-admin/DeptDashboard.jsx';
import DeptResourcesPage from './pages/department-admin/DeptResourcesPage.jsx';
import AddEditResourcePage from './pages/department-admin/AddEditResourcePage.jsx';
import TimetablePage from './pages/department-admin/TimetablePage.jsx';
import BlocksPage from './pages/department-admin/BlocksPage.jsx';
import DeptBookingsPage from './pages/department-admin/DeptBookingsPage.jsx';
import DeptProfilePage from './pages/department-admin/DeptProfilePage.jsx';
import StudentRosterPage from './pages/department-admin/StudentRosterPage.jsx';

// Sports Admin Pages
import SportsDashboard from './pages/sports-admin/SportsDashboard.jsx';
import SportsFacilitiesPage from './pages/sports-admin/SportsFacilitiesPage.jsx';
import AddEditFacilityPage from './pages/sports-admin/AddEditFacilityPage.jsx';
import SportsBlocksPage from './pages/sports-admin/SportsBlocksPage.jsx';
import SportsBookingsPage from './pages/sports-admin/SportsBookingsPage.jsx';
import SportsProfilePage from './pages/sports-admin/SportsProfilePage.jsx';

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fc]">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You don't have permission to view this page.</p>
        <a href="/login" className="btn-primary btn">Back to Login</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public auth routes */}
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/verify-otp" element={<PublicOnlyRoute><VerifyOtpPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

          {/* Student routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute allowedRoles={['STUDENT']}><ResourceBrowsePage /></ProtectedRoute>} />
          <Route path="/resources/:id" element={<ProtectedRoute allowedRoles={['STUDENT']}><ResourceDetailPage /></ProtectedRoute>} />
          <Route path="/resources/:id/book" element={<ProtectedRoute allowedRoles={['STUDENT']}><BookingPage /></ProtectedRoute>} />
          <Route path="/booking-success" element={<ProtectedRoute allowedRoles={['STUDENT']}><BookingSuccessPage /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['STUDENT']}><MyBookingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProfilePage /></ProtectedRoute>} />

          {/* Department Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><DeptDashboard /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><DeptResourcesPage /></ProtectedRoute>} />
          <Route path="/admin/resources/new" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><AddEditResourcePage /></ProtectedRoute>} />
          <Route path="/admin/resources/:id/edit" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><AddEditResourcePage /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><StudentRosterPage /></ProtectedRoute>} />
          <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><TimetablePage /></ProtectedRoute>} />
          <Route path="/admin/blocks" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><BlocksPage /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><DeptBookingsPage /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}><DeptProfilePage /></ProtectedRoute>} />

          {/* Sports Admin routes */}
          <Route path="/sports/dashboard" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><SportsDashboard /></ProtectedRoute>} />
          <Route path="/sports/facilities" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><SportsFacilitiesPage /></ProtectedRoute>} />
          <Route path="/sports/facilities/new" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><AddEditFacilityPage /></ProtectedRoute>} />
          <Route path="/sports/facilities/:id/edit" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><AddEditFacilityPage /></ProtectedRoute>} />
          <Route path="/sports/blocks" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><SportsBlocksPage /></ProtectedRoute>} />
          <Route path="/sports/bookings" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><SportsBookingsPage /></ProtectedRoute>} />
          <Route path="/sports/profile" element={<ProtectedRoute allowedRoles={['SPORTS_ADMIN']}><SportsProfilePage /></ProtectedRoute>} />

          {/* Misc */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
