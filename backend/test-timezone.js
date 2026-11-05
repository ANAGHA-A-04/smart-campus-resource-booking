
import {
  fromZonedTime,
  formatInTimeZone,
} from 'date-fns-tz';

const timezone = process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata';

// Campus time: 10 November 2026, 9:30 AM
const campusTime = '2026-11-10T09:30:00';

// Convert campus time to UTC
const utcDate = fromZonedTime(campusTime, timezone);

console.log('Campus time:', campusTime);
console.log('UTC time:', utcDate.toISOString());

// Convert back to campus time
const convertedBack = formatInTimeZone(
  utcDate,
  timezone,
  'yyyy-MM-dd HH:mm:ss'
);

console.log('Converted back:', convertedBack);

// Verify the result
if (
  utcDate.toISOString() !== '2026-11-10T04:00:00.000Z' ||
  convertedBack !== '2026-11-10 09:30:00'
) {
  throw new Error('Timezone conversion test FAILED');
}

console.log('Timezone conversion test PASSED');

