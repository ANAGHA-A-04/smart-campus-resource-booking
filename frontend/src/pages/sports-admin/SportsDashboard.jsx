import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { StatCard } from '../../components/common/index.jsx';
import { resourceService, bookingService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Dumbbell, ClipboardList, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = { CONFIRMED: 'badge-success', COMPLETED: 'badge-info', CANCELLED: 'badge-danger' };

export default function SportsDashboard() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      resourceService.getAll({ type: 'SPORTS_FACILITY', limit: 50 }),
      bookingService.getAdminBookings({ limit: 10 }),
    ])
      .then(([rRes, bRes]) => {
        setResources(rRes.data?.resources || []);
        setBookings(bRes.data?.bookings || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active = resources.filter(r => r.status === 'ACTIVE');
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED');

  return (
    <AppLayout title="Sports Dashboard" breadcrumbs={['Sports Admin', 'Dashboard']}>
      <div className="bg-gradient-to-r from-[#276749] to-[#276749]/80 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Sports Admin Panel ⚽</h2>
            <p className="text-green-200 text-sm">Manage sports facilities and bookings</p>
          </div>
          <Link to="/sports/facilities/new" className="btn bg-white text-[#276749] hover:bg-green-50 font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Add Facility
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Facilities" value={resources.length} icon={Dumbbell} color="green" />
        <StatCard title="Active Facilities" value={active.length} icon={CheckCircle} color="green" />
        <StatCard title="Upcoming Bookings" value={confirmed.length} icon={Clock} color="blue" />
        <StatCard title="Recent Bookings" value={bookings.length} icon={ClipboardList} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Facilities</h3>
            <Link to="/sports/facilities" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">Manage <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="card-body">
            {loading ? <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>
              : resources.length === 0 ? (
                <div className="text-center py-8">
                  <Dumbbell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No facilities yet</p>
                  <Link to="/sports/facilities/new" className="text-xs text-[#1e3a5f] font-medium hover:underline mt-1 inline-block">Add first facility →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.slice(0, 5).map(r => (
                    <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className={`w-2.5 h-2.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.location} · {r.capacity} capacity</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Recent Bookings</h3>
            <Link to="/sports/bookings" className="text-xs text-[#1e3a5f] font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="card-body">
            {loading ? <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>
              : bookings.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map(b => (
                    <div key={b._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.resourceId?.name}</p>
                        <p className="text-xs text-gray-500">by {b.studentId?.name}</p>
                        <p className="text-xs text-gray-400">{b.startTime ? format(parseISO(b.startTime), 'MMM d, h:mm a') : ''}</p>
                      </div>
                      <span className={`badge ${STATUS_COLORS[b.status]} text-xs`}>{b.status}</span>
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
