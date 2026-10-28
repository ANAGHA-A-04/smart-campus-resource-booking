import * as bookingService from '../services/bookingService.js';
import Booking from '../models/Booking.js';

export async function createBooking(req, res, next) {
  try {
    const { resourceId, startTime, endTime, purpose } = req.validated.body;
    const booking = await bookingService.createBooking({
      studentId: req.user._id,
      resourceId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      purpose,
    });
    res.status(201).json({ success: true, message: 'Booking confirmed!', booking });
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
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('resourceId', 'name type location departmentId')
      .populate('studentId', 'name studentId email');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Students can only see their own bookings
    if (req.user.role === 'STUDENT' && booking.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { reason } = req.validated.body || {};
    const booking = await bookingService.cancelBooking({
      bookingId: req.params.id,
      studentId: req.user._id,
      reason,
    });
    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (err) {
    next(err);
  }
}

// Admin: get all bookings for a department
export async function getAdminBookings(req, res, next) {
  try {
    const user = req.user;
    const { status, resourceId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (resourceId) query.resourceId = resourceId;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    // Filter by department resources
    if (user.role === 'DEPARTMENT_ADMIN') {
      const Resource = (await import('../models/Resource.js')).default;
      const deptResources = await Resource.find({ departmentId: user.departmentId._id || user.departmentId }, '_id');
      const resourceIds = deptResources.map((r) => r._id);
      if (!resourceId) query.resourceId = { $in: resourceIds };
    }

    if (user.role === 'SPORTS_ADMIN') {
      const Resource = (await import('../models/Resource.js')).default;
      const sportResources = await Resource.find({ type: 'SPORTS_FACILITY' }, '_id');
      const resourceIds = sportResources.map((r) => r._id);
      if (!resourceId) query.resourceId = { $in: resourceIds };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('resourceId', 'name type departmentId location')
        .populate('studentId', 'name studentId email departmentId')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ]);

    res.json({ success: true, bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}
