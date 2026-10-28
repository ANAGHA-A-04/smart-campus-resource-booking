import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, ErrorState } from '../../components/common/index.jsx';
import { resourceService } from '../../services/index.js';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Users, Clock, Calendar, ArrowLeft } from 'lucide-react';

const TYPE_ICONS = { CLASSROOM: '🏫', LABORATORY: '🔬', EQUIPMENT: '🖥️', SPORTS_FACILITY: '⚽', SEMINAR_HALL: '🎤' };
const TYPE_LABELS = { CLASSROOM: 'Classroom', LABORATORY: 'Laboratory', EQUIPMENT: 'Equipment', SPORTS_FACILITY: 'Sports Facility', SEMINAR_HALL: 'Seminar Hall' };

function SlotGrid({ slots, onSelect, selectedSlot }) {
  if (!slots?.length) return <p className="text-gray-400 text-sm text-center py-6">No slots data for this day.</p>;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {slots.map((slot, i) => {
        const isSelected = selectedSlot && selectedSlot.startTime === slot.startTime;
        const isAvailable = slot.status === 'AVAILABLE';
        return (
          <button
            key={i}
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelect(isSelected ? null : slot)}
            title={slot.label || slot.startTime}
            className={`rounded-lg px-1 py-2 text-xs font-medium text-center transition-all
              ${isSelected ? 'slot-selected ring-2 ring-purple-400 scale-105' :
                isAvailable ? 'slot-available cursor-pointer hover:scale-105' :
                slot.status === 'TIMETABLE' ? 'slot-timetable cursor-not-allowed' :
                slot.status === 'BOOKED' ? 'slot-booked cursor-not-allowed' :
                'slot-unavailable cursor-not-allowed'}`}
          >
            {slot.startTime?.slice(0, 5)}
          </button>
        );
      })}
    </div>
  );
}

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    resourceService.getById(id)
      .then(r => setResource(r.data?.resource))
      .catch(err => setError(err.response?.data?.message || 'Resource not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setAvailLoading(true);
    setSelectedSlot(null);
    resourceService.getAvailability(id, { date: format(selectedDate, 'yyyy-MM-dd') })
      .then(r => setAvailability(r.data))
      .catch(() => setAvailability(null))
      .finally(() => setAvailLoading(false));
  }, [id, selectedDate]);

  const handleBook = () => {
    if (!selectedSlot) return;
    navigate(`/resources/${id}/book`, {
      state: {
        resource,
        date: format(selectedDate, 'yyyy-MM-dd'),
        slot: selectedSlot,
      },
    });
  };

  if (loading) return <AppLayout title="Resource Details"><LoadingState /></AppLayout>;
  if (error || !resource) return (
    <AppLayout title="Not Found">
      <ErrorState message={error || 'Resource not found'} onRetry={() => navigate('/resources')} />
    </AppLayout>
  );

  return (
    <AppLayout title={resource.name} breadcrumbs={['Resources', resource.name]}>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-4 gap-1.5 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Resource Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Main Info Card */}
          <div className="card p-5">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
              {TYPE_ICONS[resource.type]}
            </div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">{resource.name}</h2>
            <p className="text-xs text-gray-400 mb-3">{TYPE_LABELS[resource.type]}</p>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{resource.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Capacity: {resource.capacity}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Max {resource.maxBookingDurationHours}h per booking</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Book up to {resource.bookingLeadTimeDays} days ahead</span>
              </div>
            </div>

            {resource.features?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {resource.features.map(f => (
                    <span key={f} className="badge-info badge">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {resource.description && (
              <p className="mt-4 text-sm text-gray-500 border-t pt-3">{resource.description}</p>
            )}
          </div>

          {/* Legend */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">Slot Legend</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="w-6 h-4 rounded slot-available inline-block"></span> Available</div>
              <div className="flex items-center gap-2"><span className="w-6 h-4 rounded slot-booked inline-block"></span> Already Booked</div>
              <div className="flex items-center gap-2"><span className="w-6 h-4 rounded slot-timetable inline-block"></span> Class Timetable</div>
              <div className="flex items-center gap-2"><span className="w-6 h-4 rounded slot-unavailable inline-block"></span> Blocked/Exam</div>
              <div className="flex items-center gap-2"><span className="w-6 h-4 rounded slot-selected inline-block"></span> Your Selection</div>
            </div>
          </div>
        </div>

        {/* Right: Availability */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Navigator */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1e3a5f]">Check Availability</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(d => subDays(d, 1))}
                  disabled={startOfDay(selectedDate) <= startOfDay(new Date())}
                  className="btn btn-secondary btn-sm p-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-[#1e3a5f] w-36 text-center">
                  {format(selectedDate, 'EEE, MMM d, yyyy')}
                </span>
                <button
                  onClick={() => setSelectedDate(d => addDays(d, 1))}
                  disabled={selectedDate >= addDays(new Date(), resource.bookingLeadTimeDays || 7)}
                  className="btn btn-secondary btn-sm p-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {availLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <SlotGrid
                slots={availability?.slots || []}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            )}
          </div>

          {/* Selected Slot + Book */}
          {selectedSlot && (
            <div className="card p-5 border-2 border-[#1e3a5f] fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Selected Time Slot</p>
                  <p className="font-bold text-[#1e3a5f] text-lg">
                    {selectedSlot.startTime?.slice(0, 5)} – {selectedSlot.endTime?.slice(0, 5)}
                  </p>
                  <p className="text-sm text-gray-500">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <button
                  onClick={handleBook}
                  className="btn-primary btn btn-lg"
                >
                  Book This Slot →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
