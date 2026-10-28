import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, UserPlus } from 'lucide-react';
import { authService } from '../../services/index.js';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  studentId: z.string().min(3, 'Student ID is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError('');
    try {
      await authService.register({
        name: data.name,
        studentId: data.studentId,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      navigate('/verify-otp', { state: { email: data.email } });
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#1e3a5f] leading-tight">CUSAT</h1>
            <p className="text-gray-400 text-xs">Smart Campus Resource Booking</p>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">Create Your Account</h2>
          <p className="text-gray-500 text-sm mb-6">Register with your CUSAT email to get started.</p>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <input {...register('name')} className={`form-input ${errors.name ? 'form-input-error' : ''}`} placeholder="Your full name" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div>
              <label className="form-label">Roll Number</label>
              <input {...register('studentId')} className={`form-input ${errors.studentId ? 'form-input-error' : ''}`} placeholder="e.g. 20223517" />
              {errors.studentId && <p className="form-error">{errors.studentId.message}</p>}
            </div>

            <div>
              <label className="form-label">CUSAT Email Address</label>
              <input
                {...register('email')}
                type="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                placeholder="student@ug.cusat.ac.in"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
              <p className="form-hint">Use your @ug.cusat.ac.in or @pg.cusat.ac.in email</p>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input pr-10 ${errors.password ? 'form-input-error' : ''}`}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className={`form-input pr-10 ${errors.confirmPassword ? 'form-input-error' : ''}`}
                  placeholder="Repeat your password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Your department is automatically verified and assigned from official university records matching your Student ID and institutional email.</span>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending OTP...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Send Verification OTP</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1e3a5f] font-medium hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
