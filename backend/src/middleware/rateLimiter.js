import rateLimit from 'express-rate-limit';

function createLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Auth endpoints: 10 attempts per 15 minutes
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many attempts. Please try again in 15 minutes.'
);

// OTP send: 5 per 10 minutes
export const otpLimiter = createLimiter(
  10 * 60 * 1000,
  5,
  'Too many OTP requests. Please wait before requesting another.'
);

// General API: 200 requests per minute
export const generalLimiter = createLimiter(
  60 * 1000,
  200,
  'Too many requests. Please slow down.'
);
