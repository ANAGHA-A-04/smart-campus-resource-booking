import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, MapPin, BookMarked } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, resource } = location.state || {};

  if (!booking) {
    navigate('/my-bookings');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="max-w-md w-full fade-in">
        {/* Success Animation */}
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your booking has been successfully created. See you there!
          </p>

          {/* Booking Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-500 font-medium mb-1">Booking Reference</p>
            <p className="font-mono font-bold text-[#1e3a5f] text-lg tracking-widest">
              {booking.bookingReference}
            </p>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-600">
              <BookMarked className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{resource?.name || 'Resource'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{resource?.location || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{format(parseISO(booking.startTime), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {format(parseISO(booking.startTime), 'h:mm a')} – {format(parseISO(booking.endTime), 'h:mm a')}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/my-bookings" className="btn-secondary btn flex-1">My Bookings</Link>
            <Link to="/resources" className="btn-primary btn flex-1">Book Another</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
