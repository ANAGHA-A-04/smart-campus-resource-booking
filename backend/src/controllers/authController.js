import * as authService from '../services/authService.js';
import { config } from '../config/environment.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req, res, next) {
  try {
    const { name, studentId, email, password } = req.validated.body;
    const result = await authService.initiateRegistration({ name, studentId, email, password });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.validated.body;
    const result = await authService.verifyEmailOtp({ email, otp });
    if (result.token) {
      res.cookie('token', result.token, COOKIE_OPTIONS);
    }
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const { email } = req.validated.body;
    const result = await authService.resendOtp({ email });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.validated.body;
    const { token, user } = await authService.loginUser({ identifier, password });
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(200).json({ success: true, message: 'Logged in successfully', token, user });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

export async function getMe(req, res) {
  res.status(200).json({ success: true, user: req.user });
}

export async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateUserProfile(req.user._id, req.body);
    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.validated.body;
    const result = await authService.forgotPassword({ email });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.validated.body;
    const result = await authService.resetPassword({ token, newPassword });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
