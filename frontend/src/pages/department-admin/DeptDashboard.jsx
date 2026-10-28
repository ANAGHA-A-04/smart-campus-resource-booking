import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { StatCard } from '../../components/common/index.jsx';
import { resourceService, bookingService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Building2, ClipboardList, Clock, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = { CONFIRMED: 'badge-success', COMPLETED: 'badge-info', CANCELLED: 'badge-danger' };

export default function DeptDashboard() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      resourceService.getAll({ limit: 50 }),
      bookingService.getAdminBookings({ limit: 10 }),
    ])
      .then(([rRes, bRes]) => {
        setResources(rRes.data?.resources || []);
        setBookings(bRes.data?.bookings || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeResources = resources.filter(r => r.status === 'ACTIVE');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const todayBookings = bookings.filter(b => {
    try {
      return format(parseISO(b.startTime), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    } catch { return false; }
  });

  return (
    <AppLayout title="Admin Dashboard" breadcrumbs={['Admin', 'Dashboard']}>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0]}! 🏛️</h2>
            <p className="text-blue-200 text-sm">
              {user?.departmentId?.name} — Department Admin Panel
            </p>
          </div>
          <Link to="/admin/resources/new" className="btn bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Add Resource
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Resources" value={resources.length} icon={Building2} color="blue" />
        <StatCard title="Active Resources" value={activeResources.length} icon={CheckCircle} color="green" />
        <StatCard title="Today's Bookings" value={todayBookings.length} icon={Clock} color="yellow" />
        <StatCard title="Confirmed Bookings" value={confirmedBookings.length} icon={ClipboardList} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Your Resources */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Your Resources
            </h3>
            <Link to="/admin/resources" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">
              Manage all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No resources yet</p>
                <Link to="/admin/resources/new" className="text-xs text-[#1e3a5f] font-medium hover:underline mt-1 inline-block">
                  Add your first resource →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {resources.slice(0, 5).map(r => (
                  <Link key={r._id} to={`/admin/resources/${r._id}/edit`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.type.replace('_', ' ')} · {r.capacity} seats</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1e3a5f]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Recent Bookings
            </h3>
            <Link to="/admin/bookings" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.slice(0, 5).map(b => (
                  <div key={b._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.resourceId?.name}</p>
                      <p className="text-xs text-gray-500 truncate">by {b.studentId?.name || 'Student'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.startTime ? format(parseISO(b.startTime), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                    <span className={`badge ${STATUS_COLORS[b.status]} flex-shrink-0 text-xs`}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
