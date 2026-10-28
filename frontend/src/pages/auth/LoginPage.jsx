import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const schema = z.object({
  identifier: z.string().min(1, 'Email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError('');
    try {
      const user = await login(data);
      const dashMap = { STUDENT: '/dashboard', DEPARTMENT_ADMIN: '/admin/dashboard', SPORTS_ADMIN: '/sports/dashboard' };
      navigate(dashMap[user.role] || '/dashboard');
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#1e3a5f] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">CUSAT</h1>
            <p className="text-blue-200 text-xs">Smart Campus</p>
          </div>
        </div>
        <div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Smart Campus<br />Resource Booking
          </h2>
          <p className="text-blue-200 text-lg">
            Book classrooms, labs, equipment, and sports facilities — all in one place.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {['Classrooms', 'Laboratories', 'Equipment', 'Sports Facilities'].map((item) => (
              <div key={item} className="bg-white/10 rounded-xl p-4">
                <p className="text-white text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">Cochin University of Science and Technology</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#1e3a5f] leading-tight">CUSAT</h1>
              <p className="text-gray-400 text-xs">Smart Campus Resource Booking</p>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to manage campus resource bookings.</p>

            {apiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  {...register('identifier')}
                  type="email"
                  className={`form-input ${errors.identifier ? 'form-input-error' : ''}`}
                  placeholder="your.email@cusat.ac.in"
                  autoComplete="email"
                />
                {errors.identifier && <p className="form-error">{errors.identifier.message}</p>}
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input pr-10 ${errors.password ? 'form-input-error' : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-[#1e3a5f] hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#1e3a5f] font-medium hover:underline">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
