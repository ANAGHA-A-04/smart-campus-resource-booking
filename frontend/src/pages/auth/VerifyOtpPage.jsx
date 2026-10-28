import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { authService } from '../../services/index.js';

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.verifyOtp({ email, otp: code });
      navigate('/login', { state: { verified: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await authService.resendOtp({ email });
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
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
          {/* Email icon */}
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📧</span>
          </div>

          <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-2">Verify Your Email</h2>
          <p className="text-sm text-gray-500 text-center mb-2">
            We sent a 6-digit OTP to
          </p>
          <p className="text-sm font-semibold text-[#1e3a5f] text-center mb-7 break-all">{email}</p>

          <form onSubmit={handleSubmit}>
            {/* OTP Inputs */}
            <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all
                    ${digit ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-300 bg-white'}
                    ${error ? 'border-red-400' : ''}`}
                  autoFocus={i === 0}
                  autoComplete="off"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="btn-primary btn w-full btn-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : 'Verify Email'}
            </button>
          </form>

          <div className="text-center mt-5">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-[#1e3a5f] text-sm font-medium hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            ) : (
              <p className="text-gray-400 text-sm">
                Resend OTP in <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Wrong email?{' '}
              <button onClick={() => navigate('/register')} className="text-[#1e3a5f] font-medium hover:underline">
                Go back
              </button>
            </p>
          </div>
        </div>

        {/* Dev hint */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 text-center">
          💡 Development mode: Check the backend terminal for the OTP
        </div>
      </div>
    </div>
  );
}
