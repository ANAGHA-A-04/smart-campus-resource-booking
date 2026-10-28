import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
    studentId: z.string().min(3, 'Student ID is required').max(30).trim(),
    email: z.string().email('Invalid email address').toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    departmentId: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Email or Student ID is required').trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});
