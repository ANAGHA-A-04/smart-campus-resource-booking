import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, ErrorState } from '../../components/common/index.jsx';
import { resourceService } from '../../services/index.js';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Users, Clock, Calendar, ArrowLeft, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const TYPE_ICONS = { CLASSROOM: '🏫', LABORATORY: '🔬', EQUIPMENT: '🖥️', SPORTS_FACILITY: '⚽', SEMINAR_HALL: '🎤' };
const TYPE_LABELS = { CLASSROOM: 'Classroom', LABORATORY: 'Laboratory', EQUIPMENT: 'Equipment', SPORTS_FACILITY: 'Sports Facility', SEMINAR_HALL: 'Seminar Hall' };

function SlotGrid({
  slots,
  onSelect,
  selectedSlots,
  availability,
  onNextWorkingDay,
  minDurationMinutes,
  maxDurationMinutes,
  resourceType,
}) {
  if (availability?.isClosed) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">{resourceType === 'SPORTS_FACILITY' ? '⚽' : '🏛️'}</div>
        <h4 className="font-semibold text-amber-900 mb-1">
          {availability.reason || 'Closed on this day'}
        </h4>
        <p className="text-sm text-amber-700 mb-4">
          {resourceType === 'SPORTS_FACILITY'
            ? 'Sports facilities operate Monday to Sunday from 06:00 AM to 08:00 PM.'
            : <>Academic facilities and labs operate Monday to Saturday from <strong>09:30 AM to 04:30 PM</strong>.</>}
        </p>
        {onNextWorkingDay && (
          <button
            onClick={onNextWorkingDay}
            className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shadow-sm inline-flex items-center"
          >
            Jump to Next Working Day <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (!slots?.length) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm font-medium">No slots data available for this day.</p>
        <p className="text-xs text-gray-400 mt-1">Please select another date using the arrows above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {slots.map((slot, i) => {
        const isSelected = selectedSlots.some(
  selected => selected.startTime === slot.startTime
);
        const isAvailable = slot.status === 'AVAILABLE';
        return (
          <button
            key={i}
            disabled={!isAvailable}
            onClick={() => {
  if (!isAvailable) return;

  const alreadySelected = selectedSlots.some(
    selected => selected.startTime === slot.startTime
  );

  if (alreadySelected) {
    onSelect([]);
  } else if (selectedSlots.length === 0) {
    onSelect([slot]);
  } else {
    const firstSlot = selectedSlots[0];

    const startIndex = slots.findIndex(
      s => s.startTime === firstSlot.startTime
    );

    const endIndex = slots.findIndex(
      s => s.startTime === slot.startTime
    );

    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);

    const range = slots.slice(rangeStart, rangeEnd + 1);

    const allAvailable = range.every(
      s => s.status === 'AVAILABLE'
    );

    const startTime = new Date(`2000-01-01T${range[0].startTime}:00`);
    const endTime = new Date(`2000-01-01T${range[range.length - 1].endTime}:00`);

    const durationMinutes = (endTime - startTime) / 60000;

    if (
      allAvailable &&
      durationMinutes >= minDurationMinutes &&
      durationMinutes <= maxDurationMinutes
    ) {
      onSelect(range);
    } else {
      onSelect([slot]);
    }
  }
}}
            title={slot.label || `${slot.startTime} – ${slot.endTime}`}
            className={`rounded-xl p-2.5 text-xs text-center transition-all duration-150 flex flex-col items-center justify-center gap-0.5
              ${isSelected ? 'slot-selected ring-2 ring-purple-500 shadow-md scale-105 font-bold' :
                isAvailable ? 'slot-available cursor-pointer hover:shadow-md hover:scale-102 font-medium' :
                slot.status === 'TIMETABLE' ? 'slot-timetable cursor-not-allowed opacity-90' :
                slot.status === 'BOOKED' ? 'slot-booked cursor-not-allowed opacity-80' :
                'slot-unavailable cursor-not-allowed opacity-75'}`}
          >
            <span className="font-semibold text-sm">{slot.startTime} – {slot.endTime}</span>
            <span className="text-[10px] tracking-tight truncate max-w-full">
              {slot.status === 'TIMETABLE' ? (slot.label?.replace('Class: ', '') || 'Class Timetable') :
               slot.status === 'BOOKED' ? (slot.capacity ? `Full (${slot.capacity}/${slot.capacity})` : 'Booked') :
               slot.status === 'UNAVAILABLE' ? 'Blocked' :
               isSelected ? 'Selected' :
               (slot.spotsLeft !== undefined ? `${slot.spotsLeft} spot${slot.spotsLeft === 1 ? '' : 's'} left` : 'Open Slot')}
            </span>
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
  const [selectedSlots, setSelectedSlots] = useState([]);
  useEffect(() => {
    resourceService.getById(id)
      .then(r => setResource(r.data?.resource))
      .catch(err => setError(err.response?.data?.message || 'Resource not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setAvailLoading(true);
    setSelectedSlots([]);
    resourceService.getAvailability(id, { date: format(selectedDate, 'yyyy-MM-dd') })
      .then(r => setAvailability(r.data))
      .catch(() => setAvailability(null))
      .finally(() => setAvailLoading(false));
  }, [id, selectedDate]);


  const handleBook = () => {
  if (!selectedSlots.length) return;

  const firstSlot = selectedSlots[0];
  const lastSlot = selectedSlots[selectedSlots.length - 1];

  navigate(`/resources/${id}/book`, {
    state: {
      resource,
      date: format(selectedDate, 'yyyy-MM-dd'),
      slot: {
        ...firstSlot,
        endTime: lastSlot.endTime,
      },
    },
  });
};

  const jumpToNextWorkingDay = () => {
    let nextDate = addDays(selectedDate, 1);
    while (nextDate.getDay() === 0) {
      nextDate = addDays(nextDate, 1);
    }
    setSelectedDate(nextDate);
  };

  if (loading) return <AppLayout title="Resource Details"><LoadingState /></AppLayout>;
  if (error || !resource) return (
    <AppLayout title="Not Found">
      <ErrorState message={error || 'Resource not found'} onRetry={() => navigate('/resources')} />
    </AppLayout>
  );

  const displayCapacity = resource.capacity || resource.bookingRules?.capacity || 60;
  const displayMaxHours = resource.maxBookingDurationHours || (resource.bookingRules?.maxDurationMinutes ? resource.bookingRules.maxDurationMinutes / 60 : 3);
  const displayAdvanceDays = resource.bookingLeadTimeDays || resource.bookingRules?.advanceBookingDays || 14;

  return (
    <AppLayout title={resource.name} breadcrumbs={['Resources', resource.name]}>
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-4 gap-1.5 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back to Resources
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Resource Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Main Info Card */}
          <div className="card p-5">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
              {TYPE_ICONS[resource.type] || '🏛️'}
            </div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">{resource.name}</h2>
            <p className="text-xs text-gray-400 mb-3">{TYPE_LABELS[resource.type] || resource.type}</p>

            <div className="space-y-2.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{resource.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Capacity: <strong>{displayCapacity}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Max <strong>{displayMaxHours}h</strong> per booking</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Book up to <strong>{displayAdvanceDays} days</strong> ahead</span>
              </div>
            </div>

            {/* Operating Hours Banner */}
            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                {resource.type === 'SPORTS_FACILITY'
                  ? 'Sports Facility Timing: 06:00 AM – 08:00 PM (Monday – Sunday)'
                  : 'College Timing: 09:30 AM – 04:30 PM (Mon – Sat)'}
              </span>
            </div>

            {resource.features?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {resource.features.map(f => (
                    <span key={f} className="badge-info badge text-xs">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {resource.description && (
              <p className="mt-4 text-sm text-gray-500 border-t pt-3 leading-relaxed">{resource.description}</p>
            )}
          </div>

          {/* Legend */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Slot Legend</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-5 rounded slot-available inline-block border"></span>
                <span><strong>Available</strong> (Ready to book)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-5 rounded slot-timetable inline-block border"></span>
                <span><strong>Class Timetable</strong> (Course lectures/labs)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-5 rounded slot-booked inline-block border"></span>
                <span><strong>Already Booked</strong> (By another student)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-5 rounded slot-unavailable inline-block border"></span>
                <span><strong>Blocked</strong> (Maintenance / Exams)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-5 rounded slot-selected inline-block border"></span>
                <span><strong>Your Selection</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Availability */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Navigator */}
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-[#1e3a5f] text-base">Select Date & Time Slot</h3>
                <p className="text-xs text-gray-500">Slots adjust automatically according to timetable and blocks</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setSelectedDate(d => subDays(d, 1))}
                  disabled={startOfDay(selectedDate) <= startOfDay(new Date())}
                  className="btn btn-secondary btn-sm p-1.5 h-8 w-8 disabled:opacity-40"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-[#1e3a5f] px-3 min-w-[150px] text-center">
                  {format(selectedDate, 'EEE, MMM d, yyyy')}
                </span>
                <button
                  onClick={() => setSelectedDate(d => addDays(d, 1))}
                  disabled={selectedDate >= addDays(new Date(), displayAdvanceDays)}
                  className="btn btn-secondary btn-sm p-1.5 h-8 w-8 disabled:opacity-40"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {availLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-7 h-7 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading slot availability...</span>
              </div>
            ) : (
              <SlotGrid
  slots={availability?.slots || []}
  selectedSlots={selectedSlots}
  onSelect={setSelectedSlots}
  availability={availability}
  onNextWorkingDay={jumpToNextWorkingDay}
  minDurationMinutes={resource?.bookingRules?.minDurationMinutes || 30}
  maxDurationMinutes={resource?.bookingRules?.maxDurationMinutes || 180}
  resourceType={resource?.type}
/>
            )}
          </div>

          {/* Selected Slot Confirmation Bar */}
          {selectedSlots.length > 0 && (
            <div className="card p-5 border-2 border-emerald-500 bg-emerald-50/30 shadow-md fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Selected Slot</p>
                    <p className="font-bold text-[#1e3a5f] text-lg">
                      {selectedSlots[0].startTime} – {selectedSlots[selectedSlots.length - 1].endTime}
                    </p>
                    <p className="text-xs text-gray-600">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                </div>
                <button
                  onClick={handleBook}
                  className="btn-primary btn btn-md font-semibold shrink-0 gap-2 shadow-sm"
                >
                  Proceed to Book <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
