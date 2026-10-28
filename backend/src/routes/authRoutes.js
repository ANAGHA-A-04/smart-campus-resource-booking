import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authSchemas.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/verify-otp', authLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', otpLimiter, validateRequest(resendOtpSchema), authController.resendOtp);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);

export default router;
