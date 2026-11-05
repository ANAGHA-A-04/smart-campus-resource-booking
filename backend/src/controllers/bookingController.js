
import * as bookingService from '../services/bookingService.js';
import Booking from '../models/Booking.js';
import Resource from '../models/Resource.js';

import { fromZonedTime } from 'date-fns-tz';

const CAMPUS_TIMEZONE =
  process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata';

// Convert campus-local datetime to UTC.
// If the input already contains a timezone, preserve that instant.
function parseBookingDateTime(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Start time and end time are required.');
  }

  const hasTimezone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);

  const date = hasTimezone
    ? new Date(value)
    : fromZonedTime(value, CAMPUS_TIMEZONE);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid booking date or time.');
  }

  return date;
}

export async function createBooking(req, res, next) {
  try {
    const {
      resourceId,
      startTime,
      endTime,
      purpose,
    } = req.validated.body;

    const start = parseBookingDateTime(startTime);
    const end = parseBookingDateTime(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.',
      });
    }

    const booking = await bookingService.createBooking({
      studentId: req.user._id,
      resourceId,
      startTime: start,
      endTime: end,
      purpose,
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const { status, page, limit } = req.query;

    const result = await bookingService.getStudentBookings({
      studentId: req.user._id,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('resourceId', 'name type location departmentId')
      .populate('studentId', 'name studentId email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Students can only see their own bookings.
    if (
      req.user.role === 'STUDENT' &&
      booking.studentId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Department administrators can only see their department's bookings.
    if (req.user.role === 'DEPARTMENT_ADMIN') {
      const bookingDepartmentId =
        booking.resourceId?.departmentId?.toString();

      const adminDepartmentId =
        req.user.departmentId?._id?.toString() ||
        req.user.departmentId?.toString();

      if (!adminDepartmentId || bookingDepartmentId !== adminDepartmentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    }

    // Sports administrators can only see sports facility bookings.
    if (
      req.user.role === 'SPORTS_ADMIN' &&
      booking.resourceId?.type !== 'SPORTS_FACILITY'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { reason } = req.validated.body || {};

    const booking = await bookingService.cancelBooking({
      bookingId: req.params.id,
      user: req.user,
      reason,
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (err) {
    next(err);
  }
}

// Admin: get bookings within their permitted resources.
export async function getAdminBookings(req, res, next) {
  try {
    const user = req.user;

    const {
      status,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    // Apply role-based resource restrictions.
    // These restrictions apply even when resourceId is supplied.
    if (user.role === 'DEPARTMENT_ADMIN') {
      const departmentId =
        user.departmentId?._id || user.departmentId;

      if (!departmentId) {
        return res.status(403).json({
          success: false,
          message: 'Department access not configured.',
        });
      }

      const resources = await Resource.find(
        { departmentId },
        '_id'
      );

      const allowedIds = resources.map((r) => r._id);

      query.resourceId = resourceId
        ? {
            $in: allowedIds.filter(
              (id) => id.toString() === resourceId
            ),
          }
        : { $in: allowedIds };
    } else if (user.role === 'SPORTS_ADMIN') {
      const resources = await Resource.find(
        { type: 'SPORTS_FACILITY' },
        '_id'
      );

      const allowedIds = resources.map((r) => r._id);

      query.resourceId = resourceId
        ? {
            $in: allowedIds.filter(
              (id) => id.toString() === resourceId
            ),
          }
        : { $in: allowedIds };
    } else if (resourceId) {
      query.resourceId = resourceId;
    }

    // Interpret date-only filters as campus calendar dates.
    if (startDate || endDate) {
      query.startTime = {};

      if (startDate) {
        query.startTime.$gte = fromZonedTime(
          `${startDate}T00:00:00`,
          CAMPUS_TIMEZONE
        );
      }

      if (endDate) {
        // Exclusive next-day boundary includes the entire end date.
        const nextDay = new Date(`${endDate}T00:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const nextDayKey = nextDay.toISOString().slice(0, 10);

        query.startTime.$lt = fromZonedTime(
          `${nextDayKey}T00:00:00`,
          CAMPUS_TIMEZONE
        );
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (currentPage - 1) * pageLimit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('resourceId', 'name type departmentId location')
        .populate('studentId', 'name studentId email departmentId')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(pageLimit),

      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      bookings,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageLimit),
    });
  } catch (err) {
    next(err);
  }
}
