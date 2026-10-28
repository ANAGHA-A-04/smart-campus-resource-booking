import TimetableEntry from '../models/TimetableEntry.js';
import ResourceBlock from '../models/ResourceBlock.js';
import Booking from '../models/Booking.js';
import Resource from '../models/Resource.js';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Parse "HH:MM" time string and return a Date on the given date
 */
function timeStringToDate(dateObj, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(dateObj);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Check if two intervals [s1, e1) and [s2, e2) overlap
 * Using half-open intervals: [start, end)
 */
export function intervalsOverlap(s1, e1, s2, e2) {
  return s1 < e2 && s2 < e1;
}

/**
 * Get all timetable-blocked intervals for a resource on a specific date
 */
async function getTimetableBlocksForDate(resourceId, date) {
  const dayOfWeek = DAY_NAMES[date.getDay()];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const entries = await TimetableEntry.find({
    resourceId,
    isActive: true,
    effectiveFrom: { $lte: endOfDay },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: startOfDay } }],
    $or: [
      // Weekly recurrence matching this day
      { recurrence: 'WEEKLY', daysOfWeek: dayOfWeek },
      // One-off entry on this specific date
      { recurrence: 'NONE', specificDate: { $gte: startOfDay, $lte: endOfDay } },
    ],
  });

  return entries.map((entry) => ({
    start: timeStringToDate(date, entry.startTime),
    end: timeStringToDate(date, entry.endTime),
    type: 'TIMETABLE',
    title: entry.title,
    id: entry._id,
  }));
}

/**
 * Get all resource blocks overlapping a date
 */
async function getResourceBlocksForDate(resourceId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const blocks = await ResourceBlock.find({
    resourceId,
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay },
  });

  return blocks.map((b) => ({
    start: b.startTime,
    end: b.endTime,
    type: 'BLOCK',
    blockType: b.blockType,
    description: b.description,
    id: b._id,
  }));
}

/**
 * Get all confirmed bookings overlapping a date
 */
async function getBookingsForDate(resourceId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    resourceId,
    status: 'CONFIRMED',
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay },
  }).populate('studentId', 'name studentId');

  return bookings.map((b) => ({
    start: b.startTime,
    end: b.endTime,
    type: 'BOOKING',
    bookingReference: b.bookingReference,
    id: b._id,
  }));
}

/**
 * Get operating hours for a resource on a given date
 */
function getOperatingHoursForDate(resource, date) {
  if (!resource.operatingHours || resource.operatingHours.length === 0) {
    // Default: 8am-8pm
    return {
      open: timeStringToDate(date, '08:00'),
      close: timeStringToDate(date, '20:00'),
      isClosed: false,
    };
  }

  const dayOfWeek = date.getDay(); // 0=Sun...6=Sat
  const hours = resource.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!hours || hours.isClosed) {
    return { isClosed: true };
  }

  return {
    open: timeStringToDate(date, hours.openTime),
    close: timeStringToDate(date, hours.closeTime),
    isClosed: false,
  };
}

/**
 * Generate free time slots from operating hours minus all busy intervals
 */
function computeFreeSlots(operatingHours, busyIntervals, slotDurationMinutes = 30) {
  if (operatingHours.isClosed) return [];

  const { open, close } = operatingHours;
  // Sort busy intervals
  const sorted = [...busyIntervals].sort((a, b) => a.start - b.start);

  const freeSlots = [];
  let cursor = new Date(open);

  for (const busy of sorted) {
    const busyStart = new Date(Math.max(busy.start.getTime(), open.getTime()));
    const busyEnd = new Date(Math.min(busy.end.getTime(), close.getTime()));

    if (cursor < busyStart) {
      // Free gap before this busy interval
      const gapMinutes = (busyStart - cursor) / 60000;
      if (gapMinutes >= slotDurationMinutes) {
        freeSlots.push({ start: new Date(cursor), end: new Date(busyStart) });
      }
    }
    if (busyEnd > cursor) {
      cursor = new Date(busyEnd);
    }
  }

  // Remaining time after last busy interval
  if (cursor < close) {
    const gapMinutes = (close - cursor) / 60000;
    if (gapMinutes >= slotDurationMinutes) {
      freeSlots.push({ start: new Date(cursor), end: new Date(close) });
    }
  }

  return freeSlots;
}

/**
 * Main availability function for a resource on a given date
 */
export async function getAvailabilityForDate(resourceId, date) {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
  if (resource.status !== 'ACTIVE' || !resource.bookingEnabled) {
    return { available: false, reason: 'Resource is not available for booking', freeSlots: [], busyIntervals: [] };
  }

  const [timetableBlocks, resourceBlocks, bookings] = await Promise.all([
    getTimetableBlocksForDate(resourceId, date),
    getResourceBlocksForDate(resourceId, date),
    getBookingsForDate(resourceId, date),
  ]);

  const busyIntervals = [...timetableBlocks, ...resourceBlocks, ...bookings];
  const operatingHours = getOperatingHoursForDate(resource, date);
  const slotDuration = resource.bookingRules?.slotDurationMinutes || 30;
  const freeSlots = computeFreeSlots(operatingHours, busyIntervals, slotDuration);

  return {
    available: freeSlots.length > 0,
    operatingHours: operatingHours.isClosed ? null : {
      open: operatingHours.open,
      close: operatingHours.close,
    },
    freeSlots,
    busyIntervals,
  };
}

/**
 * Check if a specific interval is available for a resource
 * Returns { available: true } or { available: false, reason: string }
 */
export async function checkIntervalAvailability(resourceId, startTime, endTime, excludeBookingId = null) {
  const resource = await Resource.findById(resourceId);
  if (!resource) return { available: false, reason: 'Resource not found' };
  if (resource.status !== 'ACTIVE') return { available: false, reason: 'Resource is inactive' };
  if (!resource.bookingEnabled) return { available: false, reason: 'Booking is disabled for this resource' };

  const date = new Date(startTime);

  // Check operating hours
  const opHours = getOperatingHoursForDate(resource, date);
  if (opHours.isClosed) return { available: false, reason: 'Resource is closed on this day' };
  if (startTime < opHours.open || endTime > opHours.close) {
    return { available: false, reason: 'Requested time is outside operating hours' };
  }

  // Check timetable
  const timetableBlocks = await getTimetableBlocksForDate(resourceId, date);
  for (const block of timetableBlocks) {
    if (intervalsOverlap(startTime, endTime, block.start, block.end)) {
      return { available: false, reason: `Conflicts with scheduled class: ${block.title}` };
    }
  }

  // Check resource blocks
  const resourceBlocks = await getResourceBlocksForDate(resourceId, date);
  for (const block of resourceBlocks) {
    if (intervalsOverlap(startTime, endTime, block.start, block.end)) {
      return { available: false, reason: `Resource is blocked: ${block.blockType}${block.description ? ' – ' + block.description : ''}` };
    }
  }

  // Check existing bookings
  const conflictQuery = {
    resourceId,
    status: 'CONFIRMED',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) {
    conflictQuery._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(conflictQuery);
  if (conflictingBooking) {
    return { available: false, reason: 'This time slot has already been booked' };
  }

  return { available: true };
}

/**
 * Get availability for a week (7 days starting from startDate)
 */
export async function getAvailabilityForWeek(resourceId, startDate) {
  const results = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayResult = await getAvailabilityForDate(resourceId, date);
    results.push({ date: new Date(date), ...dayResult });
  }
  return results;
}
