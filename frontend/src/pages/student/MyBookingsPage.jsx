import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { bookingService } from '../../services/index.js';
import { format, parseISO, isAfter } from 'date-fns';
import { BookMarked, XCircle, MapPin, Clock, Calendar, CheckCircle } from 'lucide-react';

const STATUS_COLORS = {
  CONFIRMED: 'badge-success',
  COMPLETED: 'badge-info',
  CANCELLED: 'badge-danger',
};

const FILTERS = ['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const fetchBookings = useCallback(() => {
    setLoading(true);
    bookingService.getMyBookings({ limit: 50 })
      .then(r => setBookings(r.data?.bookings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);

  const openCancel = (booking) => {
    setCancelTarget(booking);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await bookingService.cancel(cancelTarget._id, { cancellationReason: cancelReason || 'Cancelled by student' });
      showToast('Booking cancelled successfully', 'success');
      setShowCancelModal(false);
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = (b) => b.status === 'CONFIRMED' && isAfter(parseISO(b.startTime), new Date());

  return (
    <AppLayout title="My Bookings" breadcrumbs={['Home', 'My Bookings']}>
      {ToastComponent}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${filter === f ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-[#1e3a5f]'}`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
              ${filter === f ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
              {f === 'ALL' ? bookings.length : bookings.filter(b => b.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading your bookings..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title={filter === 'ALL' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
          description="Book a campus resource to get started"
          action={
            <Link to="/resources" className="btn-primary btn btn-sm">
              Browse Resources
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(b => {
            const isPast = !isAfter(parseISO(b.endTime), new Date());
            const isActive = isAfter(new Date(), parseISO(b.startTime)) && !isAfter(new Date(), parseISO(b.endTime));
            return (
              <div key={b._id} className={`card p-5 ${isActive ? 'border-2 border-green-400' : ''}`}>
                {isActive && (
                  <div className="flex items-center gap-2 mb-3 text-green-700 text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    ACTIVE NOW
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-[#1e3a5f] truncate">
                        {b.resourceId?.name || 'Resource'}
                      </h3>
                      <span className={`badge ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-1.5 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {format(parseISO(b.startTime), 'EEE, MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {format(parseISO(b.startTime), 'h:mm a')} – {format(parseISO(b.endTime), 'h:mm a')}
                      </div>
                      {b.resourceId?.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {b.resourceId.location}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                      <span className="font-medium">Purpose:</span> {b.purpose}
                    </p>

                    {b.status === 'CANCELLED' && b.cancellationReason && (
                      <p className="text-xs text-red-500 mt-1">
                        <span className="font-medium">Reason:</span> {b.cancellationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-gray-400 font-mono">{b.bookingReference}</p>
                    {canCancel(b) && (
                      <button
                        onClick={() => openCancel(b)}
                        className="btn-danger btn btn-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 fade-in">
            <h3 className="font-semibold text-[#1e3a5f] text-lg mb-2">Cancel Booking</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to cancel your booking at <strong>{cancelTarget?.resourceId?.name}</strong>?
            </p>
            <div className="mb-5">
              <label className="form-label">Cancellation Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
                className="form-input resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancelModal(false)} className="btn-secondary btn">Keep Booking</button>
              <button onClick={handleCancel} disabled={cancelling} className="btn-danger btn">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
