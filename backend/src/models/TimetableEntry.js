import mongoose from 'mongoose';

const RECURRENCE_TYPES = ['NONE', 'WEEKLY'];
const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const timetableEntrySchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    // For NONE recurrence: the specific date of the class (stored as Date)
    // For WEEKLY: ignored, use dayOfWeek instead
    specificDate: {
      type: Date,
      default: null,
    },
    // For WEEKLY recurrence: which day(s) of week
    daysOfWeek: {
      type: [{ type: String, enum: DAYS_OF_WEEK }],
      default: [],
    },
    // Time stored as "HH:MM" in 24hr format (campus local time)
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    recurrence: {
      type: String,
      enum: RECURRENCE_TYPES,
      default: 'WEEKLY',
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

timetableEntrySchema.index({ resourceId: 1, isActive: 1 });
timetableEntrySchema.index({ resourceId: 1, recurrence: 1 });

const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);
export default TimetableEntry;
