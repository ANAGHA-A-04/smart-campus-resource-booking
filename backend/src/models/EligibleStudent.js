import mongoose from 'mongoose';

const ELIGIBILITY_STATUSES = ['ELIGIBLE', 'INELIGIBLE', 'GRADUATED'];

const eligibleStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID / Roll Number is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    institutionalEmail: {
      type: String,
      required: [true, 'Institutional email is required'],
      lowercase: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year / batch is required'],
      trim: true, // e.g. "2023-2027", "2024-2028", "2025"
      index: true,
    },
    eligibilityStatus: {
      type: String,
      enum: ELIGIBILITY_STATUSES,
      default: 'ELIGIBLE',
      index: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: A student ID should be unique within their department
eligibleStudentSchema.index({ studentId: 1, departmentId: 1 }, { unique: true });
eligibleStudentSchema.index({ institutionalEmail: 1, departmentId: 1 }, { unique: true });

const EligibleStudent = mongoose.model('EligibleStudent', eligibleStudentSchema);

export default EligibleStudent;
