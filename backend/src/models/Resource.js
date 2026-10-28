import mongoose from 'mongoose';

const RESOURCE_TYPES = ['CLASSROOM', 'LABORATORY', 'EQUIPMENT', 'SPORTS_FACILITY', 'SEMINAR_HALL'];
const ACCESS_POLICIES = ['DEPARTMENT_ONLY', 'ALL_DEPARTMENTS', 'RESTRICTED'];
const RESOURCE_STATUSES = ['ACTIVE', 'INACTIVE'];

const operatingHoursSchema = new mongoose.Schema(
  {
    // 0=Sunday, 1=Monday, ..., 6=Saturday
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    openTime: { type: String, required: true },  // "HH:MM" 24hr format
    closeTime: { type: String, required: true }, // "HH:MM" 24hr format
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const bookingRulesSchema = new mongoose.Schema(
  {
    minDurationMinutes: { type: Number, default: 30 },
    maxDurationMinutes: { type: Number, default: 240 },
    advanceBookingDays: { type: Number, default: 30 },   // how far in advance
    cancellationHours: { type: Number, default: 2 },      // min hours before start to cancel
    slotDurationMinutes: { type: Number, default: null }, // for sports facilities
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: RESOURCE_TYPES,
      required: [true, 'Resource type is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    accessPolicy: {
      type: String,
      enum: ACCESS_POLICIES,
      required: [true, 'Access policy is required'],
    },
    // For RESTRICTED policy: specific departments allowed
    allowedDepartmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    bookingEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: RESOURCE_STATUSES,
      default: 'ACTIVE',
    },
    bookingRules: {
      type: bookingRulesSchema,
      default: () => ({}),
    },
    // For sports facilities - operating hours per day
    operatingHours: {
      type: [operatingHoursSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
resourceSchema.index({ type: 1 });
resourceSchema.index({ departmentId: 1 });
resourceSchema.index({ status: 1, bookingEnabled: 1 });
resourceSchema.index({ accessPolicy: 1 });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;
