import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../../services/index.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Check Your Email</h2>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              </p>
              <Link to="/login" className="btn-primary btn w-full">Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Mail className="w-8 h-8 text-[#1e3a5f]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-2">Forgot Password?</h2>
              <p className="text-sm text-gray-500 text-center mb-7">
                Enter your CUSAT email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@ug.cusat.ac.in"
                    className={`form-input ${error ? 'form-input-error' : ''}`}
                    autoFocus
                  />
                  {error && <p className="form-error">{error}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary btn w-full btn-lg">
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
