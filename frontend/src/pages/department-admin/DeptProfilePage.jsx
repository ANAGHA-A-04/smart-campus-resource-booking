import React from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { User, Mail, Building2, Shield } from 'lucide-react';

export default function DeptProfilePage() {
  const { user } = useAuth();
  return (
    <AppLayout title="My Profile" breadcrumbs={['Admin', 'Profile']}>
      <div className="max-w-xl mx-auto">
        <div className="card">
          <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] rounded-t-xl p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-[#1e3a5f] font-bold text-3xl shadow-lg">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <span className="badge bg-white/20 text-white text-xs mt-1">Department Admin</span>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="form-label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
              <p className="form-input bg-gray-50 text-gray-700">{user?.name}</p>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</label>
              <p className="form-input bg-gray-50 text-gray-700">{user?.email}</p>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Department</label>
              <p className="form-input bg-gray-50 text-gray-700">{user?.departmentId?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Role</label>
              <p className="form-input bg-gray-50 text-gray-700">
                <span className="badge-info badge">Department Admin</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
