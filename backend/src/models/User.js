import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['STUDENT', 'DEPARTMENT_ADMIN', 'SPORTS_ADMIN'];
const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    studentId: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ role: 1 });

// Instance method to verify password
userSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

// Never expose passwordHash in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
