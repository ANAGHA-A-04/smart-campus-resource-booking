import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Resource from '../models/Resource.js';
import { checkIntervalAvailability } from './availabilityService.js';

/**
 * Check student access policy eligibility
 */
function checkAccessPolicy(resource, student) {
  const studentDeptId = (student.departmentId?._id || student.departmentId)?.toString();
  const resourceDeptId = (resource.departmentId?._id || resource.departmentId)?.toString();

  switch (resource.accessPolicy) {
    case 'ALL_DEPARTMENTS':
      return { eligible: true };

    case 'DEPARTMENT_ONLY':
      if (!studentDeptId || !resourceDeptId) {
        return { eligible: false, reason: 'This resource is restricted to its owning department' };
      }
      if (studentDeptId !== resourceDeptId) {
        return { eligible: false, reason: 'This resource is only available to students of the owning department' };
      }
      return { eligible: true };

    case 'RESTRICTED':
      if (!resource.allowedDepartmentIds || resource.allowedDepartmentIds.length === 0) {
        return { eligible: false, reason: 'This resource has restricted access configuration' };
      }
      if (!studentDeptId) {
        return { eligible: false, reason: 'Student has no assigned department' };
      }
      const allowed = resource.allowedDepartmentIds.some(
        (id) => (id?._id || id)?.toString() === studentDeptId
      );
      if (!allowed) {
        return { eligible: false, reason: 'Your department is not authorized to book this resource' };
      }
      return { eligible: true };

    default:
      return { eligible: false, reason: 'Unknown access policy' };
  }
}

/**
 * Validate booking rules (duration, advance booking, etc.)
 */
function validateBookingRules(resource, startTime, endTime) {
  const rules = resource.bookingRules || {};
  const now = new Date();
  const durationMinutes = (endTime - startTime) / 60000;

  if (startTime <= now) {
    return { valid: false, reason: 'Cannot book a time slot in the past' };
  }

  if (rules.minDurationMinutes && durationMinutes < rules.minDurationMinutes) {
    return { valid: false, reason: `Minimum booking duration is ${rules.minDurationMinutes} minutes` };
  }

  if (rules.maxDurationMinutes && durationMinutes > rules.maxDurationMinutes) {
    return { valid: false, reason: `Maximum booking duration is ${rules.maxDurationMinutes} minutes` };
  }

  if (rules.advanceBookingDays) {
    const maxFuture = new Date(now.getTime() + rules.advanceBookingDays * 24 * 60 * 60 * 1000);
    if (startTime > maxFuture) {
      return { valid: false, reason: `Bookings can only be made up to ${rules.advanceBookingDays} days in advance` };
    }
  }

  return { valid: true };
}

/**
 * Create a booking (concurrency-safe using MongoDB transactions)
 */
export async function createBooking({ studentId, resourceId, startTime, endTime, purpose }) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    session = null;
  }

  const executeBooking = async (sess) => {
    // 1. Load resource
    const resQuery = Resource.findById(resourceId);
    if (sess) resQuery.session(sess);
    const resource = await resQuery;
    if (!resource) throw Object.assign(new Error('Resource not found'), { statusCode: 404 });

    // 2. Load student
    const User = (await import('../models/User.js')).default;
    const studentQuery = User.findById(studentId).populate('departmentId');
    if (sess) studentQuery.session(sess);
    const student = await studentQuery;
    if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });

    // 3. Check whether student's account is eligible to make bookings
    if (!student.emailVerified) {
      throw Object.assign(new Error('Unverified accounts cannot make bookings. Please verify your email first.'), { statusCode: 403 });
    }
    if (student.accountStatus !== 'ACTIVE') {
      throw Object.assign(new Error(`Account status is "${student.accountStatus}". Ineligible accounts cannot make bookings.`), { statusCode: 403 });
    }

    // 4. Check official eligibility roster status
    if (student.studentId) {
      const EligibleStudent = (await import('../models/EligibleStudent.js')).default;
      const studentDeptId = student.departmentId?._id || student.departmentId;
      const eligQuery = EligibleStudent.findOne({
        studentId: student.studentId,
        departmentId: studentDeptId,
      });
      if (sess) eligQuery.session(sess);
      const eligibleRecord = await eligQuery;

      if (eligibleRecord && eligibleRecord.eligibilityStatus !== 'ELIGIBLE') {
        throw Object.assign(
          new Error(`Booking denied: Your university student eligibility status is "${eligibleRecord.eligibilityStatus}".`),
          { statusCode: 403 }
        );
      }
    }

    // 5. Evaluate resource access policy (DEPARTMENT_ONLY, ALL_DEPARTMENTS, RESTRICTED)
    const accessCheck = checkAccessPolicy(resource, student);
    if (!accessCheck.eligible) {
      throw Object.assign(new Error(accessCheck.reason), { statusCode: 403 });
    }

    // 6. Validate booking rules
    const rulesCheck = validateBookingRules(resource, startTime, endTime);
    if (!rulesCheck.valid) {
      throw Object.assign(new Error(rulesCheck.reason), { statusCode: 400 });
    }

    // 7. Check availability (includes timetable, blocks, existing bookings)
    const availCheck = await checkIntervalAvailability(resourceId, startTime, endTime);
    if (!availCheck.available) {
      throw Object.assign(new Error(availCheck.reason), { statusCode: 409 });
    }

    // 8. Overlapping reservation check
    const conflictQuery = Booking.findOne({
      resourceId,
      status: 'CONFIRMED',
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (sess) conflictQuery.session(sess);
    const conflict = await conflictQuery;

    if (conflict) {
      throw Object.assign(
        new Error('This time slot was just booked by another user. Please select a different slot.'),
        { statusCode: 409 }
      );
    }

    // Create the booking
    const [created] = await Booking.create(
      [{ studentId, resourceId, startTime, endTime, purpose, status: 'CONFIRMED' }],
      sess ? { session: sess } : {}
    );

    await created.populate([
      { path: 'resourceId', select: 'name type location departmentId', populate: { path: 'departmentId', select: 'name code' } },
      { path: 'studentId', select: 'name studentId email' },
    ]);

    return created;
  };

  if (session) {
    try {
      let booking;
      await session.withTransaction(async () => {
        booking = await executeBooking(session);
      });
      return booking;
    } catch (err) {
      if (err.message && err.message.includes('replica set member')) {
        return await executeBooking(null);
      }
      throw err;
    } finally {
      await session.endSession();
    }
  } else {
    return await executeBooking(null);
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking({ bookingId, studentId, reason }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

  // Only the booking owner can cancel
  if (booking.studentId.toString() !== studentId.toString()) {
    throw Object.assign(new Error('You are not authorized to cancel this booking'), { statusCode: 403 });
  }

  if (booking.status !== 'CONFIRMED') {
    throw Object.assign(new Error(`Cannot cancel a booking with status: ${booking.status}`), { statusCode: 400 });
  }

  const now = new Date();
  if (booking.startTime <= now) {
    throw Object.assign(new Error('Cannot cancel a booking that has already started'), { statusCode: 400 });
  }

  // Check cancellation window
  const resource = await Resource.findById(booking.resourceId);
  const cancellationHours = resource?.bookingRules?.cancellationHours || 2;
  const cutoff = new Date(booking.startTime.getTime() - cancellationHours * 60 * 60 * 1000);
  if (now > cutoff) {
    throw Object.assign(
      new Error(`Cancellations must be made at least ${cancellationHours} hour(s) before the booking starts`),
      { statusCode: 400 }
    );
  }

  booking.status = 'CANCELLED';
  booking.cancelledAt = now;
  booking.cancellationReason = reason || 'Cancelled by student';
  await booking.save();

  return booking;
}

/**
 * Get a student's bookings
 */
export async function getStudentBookings({ studentId, status, page = 1, limit = 20 }) {
  const query = { studentId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('resourceId', 'name type location departmentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return { bookings, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Auto-complete past confirmed bookings (run periodically)
 */
export async function autoCompleteExpiredBookings() {
  const now = new Date();
  const result = await Booking.updateMany(
    { status: 'CONFIRMED', endTime: { $lt: now } },
    { status: 'COMPLETED' }
  );
  return result.modifiedCount;
}
