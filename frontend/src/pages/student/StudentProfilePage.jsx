import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/common/index.jsx';
import { User, Mail, IdCard, Building2, Shield } from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  return (
    <AppLayout title="My Profile" breadcrumbs={['Home', 'Profile']}>
      {ToastComponent}
      <div className="max-w-xl mx-auto">
        <div className="card">
          {/* Avatar Header */}
          <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] rounded-t-xl p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-[#1e3a5f] font-bold text-3xl shadow-lg">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <span className="badge bg-white/20 text-white text-xs mt-1">Student</span>
          </div>

          {/* Profile Info */}
          <div className="p-6 space-y-4">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <p className="form-input bg-gray-50 text-gray-700">{user?.name}</p>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <p className="form-input bg-gray-50 text-gray-700">{user?.email}</p>
            </div>
            {user?.studentId && (
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5" /> Student ID
                </label>
                <p className="form-input bg-gray-50 text-gray-700">{user?.studentId}</p>
              </div>
            )}
            {user?.departmentId && (
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Department
                </label>
                <p className="form-input bg-gray-50 text-gray-700">
                  {user.departmentId?.name || 'N/A'}
                </p>
              </div>
            )}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Account Status
              </label>
              <p className="form-input bg-gray-50 text-gray-700">
                <span className="badge-success badge">{user?.accountStatus}</span>
              </p>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Need to update your profile?</p>
              <p>Contact your Department Administrator or the IT Helpdesk to make changes to your profile.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
