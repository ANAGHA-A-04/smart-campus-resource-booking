import dotenv from 'dotenv';
dotenv.config();

const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

export function validateEnv() {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'CUSAT Resource Booking <noreply@cusat.ac.in>',
  },
  institutionEmailDomains: (process.env.INSTITUTION_EMAIL_DOMAINS || 'ug.cusat.ac.in,pg.cusat.ac.in')
    .split(',')
    .map((d) => d.trim().toLowerCase()),
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
  },
  resetTokenExpiryMinutes: parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '30', 10),
  campusTimezone: process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata',
  devLogOtp: process.env.DEV_LOG_OTP === 'true' && process.env.NODE_ENV !== 'production',
};
