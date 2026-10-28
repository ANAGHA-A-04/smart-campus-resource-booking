import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { bookingService } from '../../services/index.js';
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';

const TYPE_ICONS = { CLASSROOM: '🏫', LABORATORY: '🔬', EQUIPMENT: '🖥️', SPORTS_FACILITY: '⚽', SEMINAR_HALL: '🎤' };

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resource, date, slot } = location.state || {};

  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If no state, redirect
  if (!resource || !slot) {
    navigate('/resources');
    return null;
  }

  // Build ISO datetimes from date + slot times
  const [startH, startM] = slot.startTime.split(':').map(Number);
  const [endH, endM] = slot.endTime.split(':').map(Number);
  const startDt = new Date(`${date}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`);
  const endDt = new Date(`${date}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`);

  const durationHours = (endDt - startDt) / (1000 * 60 * 60);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) { setError('Please enter a purpose for booking'); return; }
    if (purpose.trim().length < 10) { setError('Purpose must be at least 10 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await bookingService.create({
        resourceId: resource._id,
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
        purpose: purpose.trim(),
      });
      navigate('/booking-success', {
        state: {
          booking: res.data?.booking,
          resource,
        },
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Confirm Booking" breadcrumbs={['Resources', resource.name, 'Book']}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-4 gap-1.5 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="max-w-2xl mx-auto">
        {/* Resource Summary */}
        <div className="card p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              {TYPE_ICONS[resource.type] || '🏛️'}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-[#1e3a5f] text-lg">{resource.name}</h2>
              <div className="grid sm:grid-cols-2 gap-2 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{format(startDt, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{slot.startTime?.slice(0,5)} – {slot.endTime?.slice(0,5)} ({durationHours}h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{resource.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span>Capacity: {resource.capacity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="card p-6">
          <h3 className="font-semibold text-[#1e3a5f] mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Booking Details
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="form-label">
                Purpose of Booking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Describe why you are booking this resource (e.g., Project presentation practice, Lab experiment for CS301...)"
                rows={4}
                maxLength={500}
                className="form-input resize-none"
              />
              <div className="flex justify-between mt-1">
                <p className="form-hint">Minimum 10 characters</p>
                <p className="form-hint">{purpose.length}/500</p>
              </div>
            </div>

            {/* Booking Rules */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-xs text-blue-700 space-y-1">
              <p className="font-semibold mb-2">📋 Booking Rules:</p>
              <p>• Arrive on time. Late arrivals may result in booking cancellation.</p>
              <p>• Leave the resource in the same condition you found it.</p>
              <p>• You can cancel up to the booking start time.</p>
              <p>• Misuse of resources may result in booking privileges being suspended.</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary btn flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary btn flex-1 btn-lg">
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming...
                  </span>
                ) : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
