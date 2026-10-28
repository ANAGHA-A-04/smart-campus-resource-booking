import { config } from '../config/environment.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // JWT errors (handled in middleware but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Log in development
  if (config.nodeEnv !== 'production') {
    console.error('❌ Unhandled error:', err);
  }

  // Generic fallback — never expose stack traces in production
  res.status(err.statusCode || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message,
  });
}
