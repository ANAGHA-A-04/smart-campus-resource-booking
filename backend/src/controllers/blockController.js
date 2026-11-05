import ResourceBlock from '../models/ResourceBlock.js';
import Resource from '../models/Resource.js';
import Booking from '../models/Booking.js';

function canManageResource(user, resource) {
  if (user.role === 'DEPARTMENT_ADMIN') {
    const adminDept = user.departmentId?._id?.toString() || user.departmentId?.toString();
    return adminDept === resource.departmentId?.toString();
  }
  if (user.role === 'SPORTS_ADMIN') return resource.type === 'SPORTS_FACILITY';
  return false;
}

export async function getBlocks(req, res, next) {
  try {
    const blocks = await ResourceBlock.find({ resourceId: req.params.resourceId })
      .populate('createdBy', 'name')
      .sort({ startTime: 1 });
    res.json({ success: true, blocks });
  } catch (err) {
    next(err);
  }
}


export async function createBlock(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    if (!canManageResource(req.user, resource)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }

    const { blockType, startTime, endTime, description } = req.body;

    const blockStart = new Date(startTime);
    const blockEnd = new Date(endTime);

    if (blockEnd <= blockStart) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
    }

    // Create resource block
    const block = await ResourceBlock.create({
      resourceId: resource._id,
      blockType,
      startTime: blockStart,
      endTime: blockEnd,
      description,
      createdBy: req.user._id,
    });

    // Cancel existing confirmed bookings that overlap with this block
    const cancellationResult = await Booking.updateMany(
      {
        resourceId: resource._id,
        status: 'CONFIRMED',
        startTime: { $lt: blockEnd },
        endTime: { $gt: blockStart },
      },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Cancelled because the resource was blocked by an administrator.',
        },
      }
    );

    res.status(201).json({
      success: true,
      message: 'Block created successfully',
      block,
      cancelledBookings: cancellationResult.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
}


export async function updateBlock(req, res, next) {
  try {
    const block = await ResourceBlock.findById(req.params.id).populate('resourceId');
    if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
    if (!canManageResource(req.user, block.resourceId)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }
    Object.assign(block, req.body);
    await block.save();
    res.json({ success: true, message: 'Block updated', block });
  } catch (err) {
    next(err);
  }
}

export async function deleteBlock(req, res, next) {
  try {
    const block = await ResourceBlock.findById(req.params.id).populate('resourceId');
    if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
    if (!canManageResource(req.user, block.resourceId)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }
    await block.deleteOne();
    res.json({ success: true, message: 'Block removed' });
  } catch (err) {
    next(err);
  }
}
