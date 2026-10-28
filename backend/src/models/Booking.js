import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const BOOKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      default: () => `BRG-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    purpose: {
      type: String,
      required: [true, 'Booking purpose is required'],
      trim: true,
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'CONFIRMED',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for common lookups
bookingSchema.index({ studentId: 1, startTime: -1 });
bookingSchema.index({ resourceId: 1, startTime: 1 });
bookingSchema.index({ resourceId: 1, status: 1 });
bookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ status: 1, endTime: 1 }); // for completing past bookings

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
