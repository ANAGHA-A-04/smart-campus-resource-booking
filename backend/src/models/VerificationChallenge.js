import mongoose from 'mongoose';
import crypto from 'crypto';

const CHALLENGE_TYPES = ['EMAIL_VERIFICATION', 'PASSWORD_RESET'];

const verificationChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: CHALLENGE_TYPES,
      required: true,
    },
    // Store hashed OTP or token — never plaintext
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    used: {
      type: Boolean,
      default: false,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-expire documents via MongoDB TTL index
verificationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationChallengeSchema.index({ email: 1, type: 1 });

// Static helper: hash a token
verificationChallengeSchema.statics.hashToken = function (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const VerificationChallenge = mongoose.model('VerificationChallenge', verificationChallengeSchema);
export default VerificationChallenge;
