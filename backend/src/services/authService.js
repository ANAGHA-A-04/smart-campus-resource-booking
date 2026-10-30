import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VerificationChallenge from '../models/VerificationChallenge.js';
import EligibleStudent from '../models/EligibleStudent.js';
import { config } from '../config/environment.js';
import { sendOtpEmail, sendPasswordResetEmail } from './emailService.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateNumericOtp(length = 6) {
  const max = Math.pow(10, length);
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % max;
  return String(num).padStart(length, '0');
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isInstitutionalEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return config.institutionEmailDomains.includes(domain);
}

function signJwt(userId) {
  return jwt.sign({ userId: userId.toString() }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

export async function initiateRegistration({ name, studentId, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanStudentId = studentId?.toUpperCase().trim();

  if (!cleanStudentId) {
    throw Object.assign(new Error('Student ID / Roll Number is required'), { statusCode: 400 });
  }

  if (!isInstitutionalEmail(normalizedEmail)) {
    const domains = config.institutionEmailDomains.join(' or ');
    throw Object.assign(new Error(`Registration requires an institutional email ending in ${domains}`), { statusCode: 400 });
  }

  // 1. Validate against authorized student eligibility dataset
  const eligibleRecord = await EligibleStudent.findOne({
    studentId: cleanStudentId,
    institutionalEmail: normalizedEmail,
  }).populate('departmentId', 'name code');

  if (!eligibleRecord) {
    throw Object.assign(
      new Error(
        `Registration denied: Student ID (${cleanStudentId}) and email (${normalizedEmail}) do not match university eligibility records. Please contact your Department Administrator to be added to the official student roster.`
      ),
      { statusCode: 403 }
    );
  }

  if (eligibleRecord.eligibilityStatus !== 'ELIGIBLE') {
    throw Object.assign(
      new Error(
        `Registration denied: Your enrollment status is "${eligibleRecord.eligibilityStatus}". Only currently eligible students can register.`
      ),
      { statusCode: 403 }
    );
  }

  // 2. Check if account is already registered and verified
  const existingUser = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { studentId: cleanStudentId },
    ],
    emailVerified: true,
  });
  if (existingUser) {
    throw Object.assign(new Error('An account with this email or Student ID is already registered and verified'), { statusCode: 409 });
  }

  // 3. Check OTP resend cooldown
  const existingChallenge = await VerificationChallenge.findOne({
    email: normalizedEmail,
    type: 'EMAIL_VERIFICATION',
    used: false,
  });
  if (existingChallenge) {
    const secondsSinceSent = (Date.now() - existingChallenge.lastSentAt.getTime()) / 1000;
    if (secondsSinceSent < config.otp.resendCooldownSeconds) {
      const remaining = Math.ceil(config.otp.resendCooldownSeconds - secondsSinceSent);
      throw Object.assign(
        new Error(`Please wait ${remaining} seconds before requesting another OTP`),
        { statusCode: 429 }
      );
    }
  }

  // 4. Securely hash password
  const passwordHash = await User.hashPassword(password);

  // 5. Generate OTP and store hashed along with staged registration metadata
  const otp = generateNumericOtp(6);
  if (process.env.DEV_LOG_OTP === 'true') {
  console.log(`[DEV OTP] ${normalizedEmail}: ${otp}`);
}
  const tokenHash = VerificationChallenge.hashToken(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  // Note: Account is NOT created yet. Staged metadata is stored in the challenge.
  await VerificationChallenge.findOneAndUpdate(
    { email: normalizedEmail, type: 'EMAIL_VERIFICATION' },
    {
      tokenHash,
      expiresAt,
      attempts: 0,
      used: false,
      lastSentAt: new Date(),
      metadata: {
        name: name.trim(),
        studentId: eligibleRecord.studentId,
        passwordHash,
        departmentId: eligibleRecord.departmentId._id || eligibleRecord.departmentId,
        departmentName: eligibleRecord.departmentId.name,
      },
    },
    { upsert: true, new: true }
  );

 if (process.env.DEV_LOG_OTP === 'true') {
  console.log(`[DEV OTP] ${normalizedEmail}: ${otp}`);
} else {
  await sendOtpEmail(normalizedEmail, otp, name);
}

  return {
    message: `Verification OTP sent to ${normalizedEmail}. Please verify to complete your account creation.`,
    department: eligibleRecord.departmentId.name,
  };
}

export async function verifyEmailOtp({ email, otp }) {
  const normalizedEmail = email.toLowerCase().trim();

  const challenge = await VerificationChallenge.findOne({
    email: normalizedEmail,
    type: 'EMAIL_VERIFICATION',
    used: false,
  });

  if (!challenge) {
    throw Object.assign(new Error('No pending registration found. Please register again.'), { statusCode: 400 });
  }

  if (new Date() > challenge.expiresAt) {
    throw Object.assign(new Error('OTP has expired. Please request a new one.'), { statusCode: 400 });
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw Object.assign(new Error('Maximum verification attempts exceeded. Please register again.'), { statusCode: 400 });
  }

  const providedHash = VerificationChallenge.hashToken(otp);
  if (providedHash !== challenge.tokenHash) {
    await VerificationChallenge.findByIdAndUpdate(challenge._id, { $inc: { attempts: 1 } });
    const remaining = challenge.maxAttempts - challenge.attempts - 1;
    throw Object.assign(new Error(`Incorrect OTP. ${remaining} attempt(s) remaining.`), { statusCode: 400 });
  }

  // Mark challenge as used
  await VerificationChallenge.findByIdAndUpdate(challenge._id, { used: true });

  const staged = challenge.metadata;
  if (!staged || !staged.departmentId) {
    throw Object.assign(new Error('Registration session data missing or expired. Please register again.'), { statusCode: 400 });
  }

  // Create or activate the user account ONLY after verification succeeds
  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.name = staged.name;
    user.studentId = staged.studentId;
    user.passwordHash = staged.passwordHash;
    user.departmentId = staged.departmentId;
    user.role = 'STUDENT';
    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    await user.save();
  } else {
    user = await User.create({
      name: staged.name,
      studentId: staged.studentId,
      email: normalizedEmail,
      passwordHash: staged.passwordHash,
      departmentId: staged.departmentId,
      role: 'STUDENT',
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });
  }

  await user.populate('departmentId', 'name code');
  const token = signJwt(user._id);

  return {
    message: 'Account successfully verified and activated! Welcome to CampusSync.',
    token,
    user,
  };
}

export async function resendOtp({ email }) {
  const normalizedEmail = email.toLowerCase().trim();

  const existingChallenge = await VerificationChallenge.findOne({
    email: normalizedEmail,
    type: 'EMAIL_VERIFICATION',
    used: false,
  });

  if (!existingChallenge || !existingChallenge.metadata) {
    throw Object.assign(new Error('No pending registration found for this email. Please register again.'), { statusCode: 400 });
  }

  const secondsSinceSent = (Date.now() - existingChallenge.lastSentAt.getTime()) / 1000;
  if (secondsSinceSent < config.otp.resendCooldownSeconds) {
    const remaining = Math.ceil(config.otp.resendCooldownSeconds - secondsSinceSent);
    throw Object.assign(new Error(`Please wait ${remaining} seconds before resending.`), { statusCode: 429 });
  }

  const otp = generateNumericOtp(6);
  if (process.env.DEV_LOG_OTP === 'true') {
  console.log(`[DEV OTP] ${normalizedEmail}: ${otp}`);
}
  const tokenHash = VerificationChallenge.hashToken(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await VerificationChallenge.findOneAndUpdate(
    { email: normalizedEmail, type: 'EMAIL_VERIFICATION' },
    { tokenHash, expiresAt, attempts: 0, used: false, lastSentAt: new Date() },
    { upsert: true, new: true }
  );

if (process.env.DEV_LOG_OTP === 'true') {
  console.log(`[DEV OTP] ${normalizedEmail}: ${otp}`);
} else {
  await sendOtpEmail(normalizedEmail, otp, existingChallenge.metadata.name || 'Student');
}
  return { message: 'A new OTP has been sent to your email.' };
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginUser({ identifier, password }) {
  const normalizedId = identifier.trim();
  const isEmail = normalizedId.includes('@');

  const query = isEmail
    ? { email: normalizedId.toLowerCase() }
    : { studentId: normalizedId.toUpperCase() };

  const user = await User.findOne(query).select('+passwordHash').populate('departmentId', 'name code');

  const GENERIC_ERROR = 'Invalid credentials. Please check your Student ID/email and password.';

  if (!user) throw Object.assign(new Error(GENERIC_ERROR), { statusCode: 401 });
  if (!user.emailVerified) throw Object.assign(new Error('Please verify your email before logging in.'), { statusCode: 401 });
  if (user.accountStatus !== 'ACTIVE') throw Object.assign(new Error('Your account is inactive. Please contact administration.'), { statusCode: 401 });

  // For students, verify that eligibility in the official dataset is still ELIGIBLE
  if (user.role === 'STUDENT' && user.studentId) {
    const eligibility = await EligibleStudent.findOne({
      studentId: user.studentId,
      departmentId: user.departmentId?._id || user.departmentId,
    });
    if (eligibility && eligibility.eligibilityStatus !== 'ELIGIBLE') {
      throw Object.assign(
        new Error(`Access denied: Your student eligibility status is marked as "${eligibility.eligibilityStatus}".`),
        { statusCode: 403 }
      );
    }
  }

  const valid = await user.verifyPassword(password);
  if (!valid) throw Object.assign(new Error(GENERIC_ERROR), { statusCode: 401 });

  const token = signJwt(user._id);
  return { token, user };
}

// ─── Profile Update (Tamper-Resistant) ────────────────────────────────────────

export async function updateUserProfile(userId, { name, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash').populate('departmentId', 'name code');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  // Update name if provided
  if (name && name.trim()) {
    user.name = name.trim();
  }

  // Change password if provided
  if (newPassword) {
    if (!currentPassword) {
      throw Object.assign(new Error('Current password is required to set a new password'), { statusCode: 400 });
    }
    const match = await user.verifyPassword(currentPassword);
    if (!match) {
      throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
    }
    user.passwordHash = await User.hashPassword(newPassword);
  }

  // Note: user.departmentId, user.role, user.studentId, user.emailVerified CANNOT be changed!
  await user.save();
  return user;
}

// ─── Forgot / Reset Password ─────────────────────────────────────────────────

export async function forgotPassword({ email }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail, emailVerified: true });
  if (!user) return { message: 'If an account exists with that email, a reset link has been sent.' };

  const resetToken = generateSecureToken();
  const tokenHash = VerificationChallenge.hashToken(resetToken);
  const expiresAt = new Date(Date.now() + config.resetTokenExpiryMinutes * 60 * 1000);

  await VerificationChallenge.findOneAndUpdate(
    { email: normalizedEmail, type: 'PASSWORD_RESET' },
    { tokenHash, expiresAt, attempts: 0, used: false, lastSentAt: new Date() },
    { upsert: true, new: true }
  );

  await sendPasswordResetEmail(normalizedEmail, resetToken, user.name);
  return { message: 'If an account exists with that email, a reset link has been sent.' };
}

export async function resetPassword({ token, newPassword }) {
  const tokenHash = VerificationChallenge.hashToken(token);

  const challenge = await VerificationChallenge.findOne({
    tokenHash,
    type: 'PASSWORD_RESET',
    used: false,
  });

  if (!challenge || new Date() > challenge.expiresAt) {
    throw Object.assign(new Error('Invalid or expired reset link. Please request a new one.'), { statusCode: 400 });
  }

  const user = await User.findOne({ email: challenge.email });
  if (!user) {
    throw Object.assign(new Error('Account not found.'), { statusCode: 400 });
  }

  const passwordHash = await User.hashPassword(newPassword);
  await User.findByIdAndUpdate(user._id, { passwordHash });
  await VerificationChallenge.findByIdAndUpdate(challenge._id, { used: true });

  return { message: 'Password reset successful. You can now log in with your new password.' };
}
