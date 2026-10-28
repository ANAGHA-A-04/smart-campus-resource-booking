import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/index.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setError('All fields are required'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ token, newPassword, confirmPassword });
      navigate('/login', { state: { passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-500 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary btn w-full">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#1e3a5f] leading-tight text-sm">CUSAT</h1>
            <p className="text-xs text-gray-500">Resource Booking</p>
          </div>
        </div>

        <div className="card p-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-2">Reset Password</h2>
          <p className="text-sm text-gray-500 text-center mb-7">Enter your new password below.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="form-input pr-10"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="form-input pr-10"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
