import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/environment.js';

export async function authenticate(req, res, next) {
  try {
    // Read token from HttpOnly cookie or Authorization header (Bearer)
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }

    const user = await User.findById(decoded.userId).populate('departmentId', 'name code');
    if (!user || user.accountStatus !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Account not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}
