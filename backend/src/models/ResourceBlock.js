import mongoose from 'mongoose';

const BLOCK_TYPES = ['EXAMINATION', 'MEETING', 'EVENT', 'MAINTENANCE', 'OTHER'];

const resourceBlockSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    blockType: {
      type: String,
      enum: BLOCK_TYPES,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

resourceBlockSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });

const ResourceBlock = mongoose.model('ResourceBlock', resourceBlockSchema);
export default ResourceBlock;
