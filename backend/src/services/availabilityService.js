import TimetableEntry from '../models/TimetableEntry.js';
import ResourceBlock from '../models/ResourceBlock.js';
import Booking from '../models/Booking.js';
import Resource from '../models/Resource.js';
import { config } from '../config/environment.js';
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Parse "HH:MM" time string and return a Date on the given date
 */
function getCampusDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.campusTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
}


function getCampusDateKey(date) {
  const { year, month, day } = getCampusDateParts(date);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getCampusTimeParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.campusTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
}

function getCampusDayOfWeek(date) {
  const { year, month, day } = getCampusDateParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function campusDateTimeToDate(dateKey, timeStr) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes);

  const getOffset = (timestamp) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: config.campusTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestamp));

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );

    return Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    ) - timestamp;
  };

  const firstOffset = getOffset(utcGuess);
  const correctedTimestamp = utcGuess - firstOffset;
  const secondOffset = getOffset(correctedTimestamp);

  return new Date(utcGuess - secondOffset);
}

function timeStringToDate(dateObj, timeStr) {
  return campusDateTimeToDate(getCampusDateKey(dateObj), timeStr);
}
export function getCampusDateStart(dateKey) {
  return campusDateTimeToDate(dateKey, '00:00');
}

export function getCampusTodayStart() {
  return getCampusDateStart(getCampusDateKey(new Date()));
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
 const dayOfWeek = DAY_NAMES[getCampusDayOfWeek(date)];
const dateKey = getCampusDateKey(date);
const startOfDay = campusDateTimeToDate(dateKey, '00:00');
const nextDayStart = campusDateTimeToDate(addDaysToDateKey(dateKey, 1), '00:00');
const endOfDay = new Date(nextDayStart.getTime() - 1);
  const entries = await TimetableEntry.find({
    resourceId,
    isActive: true,
    effectiveFrom: { $lte: endOfDay },
    $and: [
      {
        $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: startOfDay } }],
      },
      {
        $or: [
          // Weekly recurrence matching this day
          { recurrence: 'WEEKLY', daysOfWeek: dayOfWeek },
          // One-off entry on this specific date
         { recurrence: 'NONE', specificDate: { $gte: startOfDay, $lt: nextDayStart } },
        ],
      },
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
  const dateKey = getCampusDateKey(date);
const startOfDay = campusDateTimeToDate(dateKey, '00:00');
const nextDayStart = campusDateTimeToDate(addDaysToDateKey(dateKey, 1), '00:00');


  const blocks = await ResourceBlock.find({
    resourceId,
    startTime: { $lt: nextDayStart },
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
  const dateKey = getCampusDateKey(date);
const startOfDay = campusDateTimeToDate(dateKey, '00:00');
const nextDayStart = campusDateTimeToDate(addDaysToDateKey(dateKey, 1), '00:00');

  const bookings = await Booking.find({
    resourceId,
    status: 'CONFIRMED',
    startTime: { $lt: nextDayStart },
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
 * Default college timings: 09:30 AM to 04:30 PM (Mon-Sat, Sunday closed)
 */
function getOperatingHoursForDate(resource, date) {
  // If specific operating hours are configured on resource (e.g. sports facilities)
  if (resource.operatingHours && resource.operatingHours.length > 0) {
    const dayOfWeek = getCampusDayOfWeek(date);// 0=Sun...6=Sat
    const hours = resource.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

    if (!hours || hours.isClosed) {
      return { isClosed: true, reason: 'Closed on this day' };
    }

    return {
      open: timeStringToDate(date, hours.openTime),
      close: timeStringToDate(date, hours.closeTime),
      isClosed: false,
    };
  }

  // Sports facilities default: 06:00 AM to 08:00 PM (20:00), open all 7 days
  if (resource.type === 'SPORTS_FACILITY') {
    return {
      open: timeStringToDate(date, '06:00'),
      close: timeStringToDate(date, '20:00'),
      isClosed: false,
    };
  }

  // College hours for academic resources (Labs, Classrooms, Seminar halls): 09:30 AM to 04:30 PM
  const dayOfWeek = getCampusDayOfWeek(date); // 0=Sun...6=Sat
  if (dayOfWeek === 0) {
    return { isClosed: true, reason: 'College is closed on Sundays' };
  }

  return {
    open: timeStringToDate(date, '09:30'),
    close: timeStringToDate(date, '16:30'),
    isClosed: false,
  };
}

/**
 * Generate free time slots from operating hours minus all busy intervals
 */
function computeFreeSlots(operatingHours, busyIntervals, slotDurationMinutes = 30, resource = null) {
  if (operatingHours.isClosed) return [];

  const { open, close } = operatingHours;
  const isSports = resource?.type === 'SPORTS_FACILITY';
  const capacity = resource?.capacity || 4;

  // For sports facilities, bookings only make an interval busy if full capacity is reached
  let effectiveBusy = busyIntervals;
  if (isSports) {
    const hardBlocks = busyIntervals.filter((b) => b.type !== 'BOOKING');
    const bookingBlocks = busyIntervals.filter((b) => b.type === 'BOOKING');
    const fullBlocks = bookingBlocks.filter((b) => {
      const overlapCount = bookingBlocks.filter((other) => intervalsOverlap(b.start, b.end, other.start, other.end)).length;
      return overlapCount >= capacity;
    });
    effectiveBusy = [...hardBlocks, ...fullBlocks];
  }

  // Sort busy intervals
  const sorted = [...effectiveBusy].sort((a, b) => a.start - b.start);

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
 * Generate discrete, color-coded slots for UI presentation
 */
function generateSlots(operatingHours, busyIntervals, slotDurationMinutes = 30, resource = null) {
  if (operatingHours.isClosed) return [];

  const slots = [];
  const { open, close } = operatingHours;
  const isSports = resource?.type === 'SPORTS_FACILITY';
  const capacity = resource?.capacity || (isSports ? 4 : 1);
  let cursor = new Date(open);

  while (cursor < close) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(Math.min(cursor.getTime() + slotDurationMinutes * 60000, close.getTime()));
    if ((slotEnd - slotStart) / 60000 < 15) break;

    const startParts = getCampusTimeParts(slotStart);
    const endParts = getCampusTimeParts(slotEnd);

    const startH = String(startParts.hour).padStart(2, '0');
    const startM = String(startParts.minute).padStart(2, '0');
    const endH = String(endParts.hour).padStart(2, '0');
    const endM = String(endParts.minute).padStart(2, '0');
    const startTimeStr = `${startH}:${startM}`;
    const endTimeStr = `${endH}:${endM}`;

    let status = 'AVAILABLE';
    let label = 'Available (Click to select)';

    // 1. Timetable collision
    const timetableMatch = busyIntervals.find(
      (b) => b.type === 'TIMETABLE' && intervalsOverlap(slotStart, slotEnd, b.start, b.end)
    );
    if (timetableMatch) {
      status = 'TIMETABLE';
      label = `Class: ${timetableMatch.title}`;
    }

    // 2. Resource Admin Block collision
    const blockMatch = busyIntervals.find(
      (b) => b.type === 'BLOCK' && intervalsOverlap(slotStart, slotEnd, b.start, b.end)
    );
    if (blockMatch) {
      status = 'UNAVAILABLE';
      label = blockMatch.description ? `Blocked: ${blockMatch.description}` : 'Blocked by Admin';
    }

    // 3. Existing booking collision with capacity calculation
    const overlappingBookings = busyIntervals.filter(
      (b) => b.type === 'BOOKING' && intervalsOverlap(slotStart, slotEnd, b.start, b.end)
    );
    const bookedCount = overlappingBookings.length;
    const spotsLeft = Math.max(0, capacity - bookedCount);

    if (status === 'AVAILABLE' && overlappingBookings.length > 0) {
      if (isSports) {
        if (bookedCount >= capacity) {
          status = 'BOOKED';
          label = `Full (${bookedCount}/${capacity} spots booked)`;
        } else {
          status = 'AVAILABLE';
          label = `${spotsLeft} of ${capacity} spots left`;
        }
      } else {
        status = 'BOOKED';
        label = 'Already Booked';
      }
    } else if (status === 'AVAILABLE' && isSports) {
      label = `Available (${capacity} spots open)`;
    }

    slots.push({
      startTime: startTimeStr,
      endTime: endTimeStr,
      status,
      label,
      spotsLeft: isSports ? spotsLeft : undefined,
      capacity: isSports ? capacity : undefined,
      bookedCount: isSports ? bookedCount : undefined,
    });

    cursor = new Date(slotEnd);
  }

  return slots;
}

/**
 * Main availability function for a resource on a given date
 */
export async function getAvailabilityForDate(resourceId, date) {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
  if (resource.status !== 'ACTIVE' || !resource.bookingEnabled) {
    return { available: false, isClosed: true, reason: 'Resource is not available for booking', freeSlots: [], busyIntervals: [], slots: [] };
  }

  const operatingHours = getOperatingHoursForDate(resource, date);
  if (operatingHours.isClosed) {
    return {
      available: false,
      isClosed: true,
      reason: operatingHours.reason || 'Closed on this day',
      operatingHours: null,
      freeSlots: [],
      busyIntervals: [],
      slots: [],
    };
  }

  const [timetableBlocks, resourceBlocks, bookings] = await Promise.all([
    getTimetableBlocksForDate(resourceId, date),
    getResourceBlocksForDate(resourceId, date),
    getBookingsForDate(resourceId, date),
  ]);

  const busyIntervals = [...timetableBlocks, ...resourceBlocks, ...bookings];
  const slotDuration = resource.bookingRules?.slotDurationMinutes || (resource.type === 'SPORTS_FACILITY' ? 60 : 30);
  const freeSlots = computeFreeSlots(operatingHours, busyIntervals, slotDuration, resource);
  const slots = generateSlots(operatingHours, busyIntervals, slotDuration, resource);

  return {
    available: freeSlots.length > 0,
    isClosed: false,
    operatingHours: {
      open: operatingHours.open,
      close: operatingHours.close,
    },
    freeSlots,
    busyIntervals,
    slots,
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

  const startDt = new Date(startTime);
  const endDt = new Date(endTime);
  const date = new Date(startDt);

  // Check operating hours
  const opHours = getOperatingHoursForDate(resource, date);
  if (opHours.isClosed) return { available: false, reason: opHours.reason || 'Resource is closed on this day' };
  if (startDt < opHours.open || endDt > opHours.close) {
    const hoursText = resource.type === 'SPORTS_FACILITY'
      ? 'sports operating hours (06:00 AM – 08:00 PM)'
      : 'college operating hours (09:30 AM – 04:30 PM)';
    return { available: false, reason: `Requested time is outside ${hoursText}` };
  }

  // Check timetable
  const timetableBlocks = await getTimetableBlocksForDate(resourceId, date);
  for (const block of timetableBlocks) {
    if (intervalsOverlap(startDt, endDt, block.start, block.end)) {
      return { available: false, reason: `Conflicts with scheduled class: ${block.title}` };
    }
  }

  // Check resource blocks
  const resourceBlocks = await getResourceBlocksForDate(resourceId, date);
  for (const block of resourceBlocks) {
    if (intervalsOverlap(startDt, endDt, block.start, block.end)) {
      return { available: false, reason: `Resource is blocked: ${block.blockType}${block.description ? ' – ' + block.description : ''}` };
    }
  }

  // Check existing bookings
  const conflictQuery = {
    resourceId,
    status: 'CONFIRMED',
    startTime: { $lt: endDt },
    endTime: { $gt: startDt },
  };
  if (excludeBookingId) {
    conflictQuery._id = { $ne: excludeBookingId };
  }

  if (resource.type === 'SPORTS_FACILITY') {
    const overlappingCount = await Booking.countDocuments(conflictQuery);
    const capacity = resource.capacity || 4;
    if (overlappingCount >= capacity) {
      return {
        available: false,
        reason: `This sports facility is full for this time slot (maximum capacity of ${capacity} students reached)`,
      };
    }
  } else {
    const conflictingBooking = await Booking.findOne(conflictQuery);
    if (conflictingBooking) {
      return { available: false, reason: 'This time slot has already been booked' };
    }
  }

  return { available: true };
}

/**
 * Get availability for a week (7 days starting from startDate)
 */
export async function getAvailabilityForWeek(resourceId, startDate) {
  const results = [];
  const startDateKey = getCampusDateKey(startDate);

  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToDateKey(startDateKey, i);
    const date = campusDateTimeToDate(dateKey, '00:00');

    const dayResult = await getAvailabilityForDate(resourceId, date);
    results.push({ date, ...dayResult });
  }

  return results;
}
