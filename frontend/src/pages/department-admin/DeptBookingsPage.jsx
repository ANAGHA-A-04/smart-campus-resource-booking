import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState } from '../../components/common/index.jsx';
import { bookingService } from '../../services/index.js';
import { ClipboardList, Search, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = { CONFIRMED: 'badge-success', COMPLETED: 'badge-info', CANCELLED: 'badge-danger' };
const FILTERS = ['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function DeptBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchBookings = useCallback(() => {
    setLoading(true);
    bookingService.getAdminBookings({ limit: 100 })
      .then(r => setBookings(r.data?.bookings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filtered = bookings
    .filter(b => filter === 'ALL' || b.status === filter)
    .filter(b => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        b.resourceId?.name?.toLowerCase().includes(s) ||
        b.studentId?.name?.toLowerCase().includes(s) ||
        b.studentId?.email?.toLowerCase().includes(s) ||
        b.bookingReference?.toLowerCase().includes(s)
      );
    });

  return (
    <AppLayout title="All Bookings" breadcrumbs={['Admin', 'Bookings']}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by resource, student, or reference..."
            className="form-input pl-9 w-full" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${filter === f ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-[#1e3a5f]'}`}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className={`ml-1 text-xs ${filter === f ? 'text-white/70' : 'text-gray-400'}`}>
                ({f === 'ALL' ? bookings.length : bookings.filter(b => b.status === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No bookings found" description="Student bookings for your department's resources will appear here" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Resource</th>
                <th>Student</th>
                <th>Date & Time</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b._id}>
                  <td className="font-mono text-xs text-gray-500">{b.bookingReference}</td>
                  <td>
                    <p className="font-medium text-gray-800 text-sm">{b.resourceId?.name}</p>
                    <p className="text-xs text-gray-400">{b.resourceId?.location}</p>
                  </td>
                  <td>
                    <p className="text-sm text-gray-700">{b.studentId?.name}</p>
                    <p className="text-xs text-gray-400">{b.studentId?.email}</p>
                  </td>
                  <td className="text-xs text-gray-600">
                    <p>{b.startTime ? format(parseISO(b.startTime), 'MMM d, yyyy') : '—'}</p>
                    <p>{b.startTime ? format(parseISO(b.startTime), 'h:mm a') : ''} – {b.endTime ? format(parseISO(b.endTime), 'h:mm a') : ''}</p>
                  </td>
                  <td className="max-w-[200px]">
                    <p className="text-xs text-gray-600 truncate">{b.purpose}</p>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
