import TimetableEntry from '../models/TimetableEntry.js';
import Resource from '../models/Resource.js';
import Booking from '../models/Booking.js';

function canManageResource(user, resource) {
  if (user.role === 'DEPARTMENT_ADMIN') {
    const adminDept = user.departmentId?._id?.toString() || user.departmentId?.toString();
    return adminDept === resource.departmentId?.toString();
  }
  if (user.role === 'SPORTS_ADMIN') {
    return resource.type === 'SPORTS_FACILITY';
  }
  return false;
}

export async function getTimetable(req, res, next) {
  try {
    const entries = await TimetableEntry.find({ resourceId: req.params.resourceId, isActive: true })
      .populate('createdBy', 'name');
    res.json({ success: true, entries });
  } catch (err) {
    next(err);
  }
}

export async function createTimetableEntry(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    if (!canManageResource(req.user, resource)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }

    const entry = await TimetableEntry.create({
      ...req.body,
      resourceId: resource._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Timetable entry created', entry });
  } catch (err) {
    next(err);
  }
}

export async function updateTimetableEntry(req, res, next) {
  try {
    const entry = await TimetableEntry.findById(req.params.id).populate('resourceId');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (!canManageResource(req.user, entry.resourceId)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }

    Object.assign(entry, req.body);
    await entry.save();
    res.json({ success: true, message: 'Timetable entry updated', entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteTimetableEntry(req, res, next) {
  try {
    const entry = await TimetableEntry.findById(req.params.id).populate('resourceId');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (!canManageResource(req.user, entry.resourceId)) {
      return res.status(403).json({ success: false, message: 'You cannot manage this resource' });
    }

    entry.isActive = false;
    await entry.save();
    res.json({ success: true, message: 'Timetable entry deleted' });
  } catch (err) {
    next(err);
  }
}
