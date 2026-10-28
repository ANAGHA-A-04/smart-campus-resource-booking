import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard, BookOpen, Calendar, Dumbbell, ClipboardList,
  Settings, LogOut, Menu, X, User, Bell, ChevronRight,
  Building2, Clock, Shield, BookMarked, Activity, Users
} from 'lucide-react';

const STUDENT_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Resources', path: '/resources', icon: BookOpen },
  { label: 'My Bookings', path: '/my-bookings', icon: BookMarked },
  { label: 'Profile', path: '/profile', icon: User },
];

const DEPT_ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Resources', path: '/admin/resources', icon: Building2 },
  { label: 'Student Roster', path: '/admin/students', icon: Users },
  { label: 'Timetable', path: '/admin/timetable', icon: Calendar },
  { label: 'Availability Blocks', path: '/admin/blocks', icon: Clock },
  { label: 'Bookings', path: '/admin/bookings', icon: ClipboardList },
  { label: 'Profile', path: '/admin/profile', icon: User },
];

const SPORTS_ADMIN_NAV = [
  { label: 'Dashboard', path: '/sports/dashboard', icon: LayoutDashboard },
  { label: 'Facilities', path: '/sports/facilities', icon: Dumbbell },
  { label: 'Blocks', path: '/sports/blocks', icon: Clock },
  { label: 'Bookings', path: '/sports/bookings', icon: ClipboardList },
  { label: 'Profile', path: '/sports/profile', icon: User },
];

const ROLE_NAV = {
  STUDENT: STUDENT_NAV,
  DEPARTMENT_ADMIN: DEPT_ADMIN_NAV,
  SPORTS_ADMIN: SPORTS_ADMIN_NAV,
};

const ROLE_LABELS = {
  STUDENT: 'Student',
  DEPARTMENT_ADMIN: 'Dept. Admin',
  SPORTS_ADMIN: 'Sports Admin',
};

export default function AppLayout({ children, title, breadcrumbs }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = ROLE_NAV[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">CUSAT</h1>
            <p className="text-blue-200 text-xs">Resource Booking</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-200 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-blue-300 text-xs">{ROLE_LABELS[user?.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-blue-800">
        <button onClick={handleLogout} className="sidebar-link w-full">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex">
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden lg:flex flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#1e3a5f] flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                {breadcrumbs && (
                  <p className="text-xs text-gray-400 mb-0.5">
                    {breadcrumbs.join(' › ')}
                  </p>
                )}
                {title && <h2 className="font-semibold text-[#1e3a5f] text-base leading-tight">{title}</h2>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.studentId || user?.email}</p>
              </div>
              <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
