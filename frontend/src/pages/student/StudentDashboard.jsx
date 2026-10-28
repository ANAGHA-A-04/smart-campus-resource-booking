import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { StatCard } from '../../components/common/index.jsx';
import { bookingService, resourceService } from '../../services/index.js';
import {
  BookMarked, Clock, CheckCircle, XCircle, BookOpen,
  ArrowRight, Calendar
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bookingService.getMyBookings({ limit: 10 }),
      resourceService.getAll({ limit: 6 }),
    ])
      .then(([bRes, rRes]) => {
        setBookings(bRes.data?.bookings || []);
        setRecentResources(rRes.data?.resources || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
  const upcoming = confirmed.filter(b => isAfter(parseISO(b.startTime), new Date()));
  const completed = bookings.filter(b => b.status === 'COMPLETED');
  const cancelled = bookings.filter(b => b.status === 'CANCELLED');

  const now = new Date();
  const active = confirmed.find(b => {
    const start = parseISO(b.startTime);
    const end = parseISO(b.endTime);
    return start <= now && end >= now;
  });

  return (
    <AppLayout title="Dashboard" breadcrumbs={['Home', 'Dashboard']}>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-blue-200 text-sm">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming booking${upcoming.length > 1 ? 's' : ''}.`
                : 'No upcoming bookings. Book a resource today!'}
            </p>
          </div>
          <Link to="/resources" className="btn bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold shrink-0">
            <BookOpen className="w-4 h-4" />
            Browse Resources
          </Link>
        </div>
      </div>

      {/* Active Booking Banner */}
      {active && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Active Booking Now</p>
            <p className="text-xs text-green-600">
              {active.resourceId?.name || 'Resource'} — until {format(parseISO(active.endTime), 'h:mm a')}
            </p>
          </div>
          <Link to="/my-bookings" className="text-xs text-green-700 font-medium hover:underline">View</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Upcoming" value={upcoming.length} icon={Calendar} color="blue" />
        <StatCard title="Active Now" value={active ? 1 : 0} icon={Clock} color="green" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} color="purple" />
        <StatCard title="Cancelled" value={cancelled.length} icon={XCircle} color="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
              <BookMarked className="w-4 h-4" /> Upcoming Bookings
            </h3>
            <Link to="/my-bookings" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No upcoming bookings</p>
                <Link to="/resources" className="text-xs text-[#1e3a5f] font-medium hover:underline mt-1 inline-block">
                  Book a resource →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 4).map(b => (
                  <div key={b._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {format(parseISO(b.startTime), 'dd')}<br />
                      <span className="text-blue-200" style={{ fontSize: '9px' }}>{format(parseISO(b.startTime), 'MMM')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{b.resourceId?.name || 'Resource'}</p>
                      <p className="text-xs text-gray-500">
                        {format(parseISO(b.startTime), 'h:mm a')} – {format(parseISO(b.endTime), 'h:mm a')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{b.purpose}</p>
                    </div>
                    <span className="badge-success badge text-xs flex-shrink-0">Confirmed</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Browse Resources */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Available Resources
            </h3>
            <Link to="/resources" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">
              Browse all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {recentResources.slice(0, 5).map(r => (
                  <Link
                    key={r._id}
                    to={`/resources/${r._id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e3a5f] flex-shrink-0">
                      {r.type === 'LABORATORY' ? '🔬' : r.type === 'SPORTS_FACILITY' ? '⚽' : r.type === 'EQUIPMENT' ? '🖥️' : '🏛️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#1e3a5f]">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.location} · Cap: {r.capacity}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1e3a5f] transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
