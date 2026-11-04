import { Readable } from 'stream';
import csvParser from 'csv-parser';
import TimetableEntry from '../models/TimetableEntry.js';
import Resource from '../models/Resource.js';
import Booking from '../models/Booking.js';

const DAYS_MAP = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

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
      .sort({ startTime: 1 })
      .populate('createdBy', 'name');
    res.json({ success: true, entries, timetable: entries });
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

    const {
      title,
      subject,
      dayOfWeek,
      daysOfWeek,
      startTime,
      endTime,
      semester,
      batch,
      facultyName,
      effectiveFrom,
      effectiveUntil,
      recurrence = 'WEEKLY',
    } = req.body;

    const entryTitle = (title || subject || 'Academic Class').trim();
    let formattedDays = [];
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      formattedDays = daysOfWeek.map((d) => String(d).toUpperCase());
    } else if (dayOfWeek !== undefined) {
      const dayName = typeof dayOfWeek === 'number' ? DAYS_MAP[dayOfWeek] : String(dayOfWeek).toUpperCase();
      if (dayName) formattedDays = [dayName];
    } else {
      formattedDays = ['MONDAY'];
    }

    const entry = await TimetableEntry.create({
      resourceId: resource._id,
      title: entryTitle,
      semester: (semester || '').trim(),
      batch: (batch || 'All').trim(),
      facultyName: (facultyName || '').trim(),
      daysOfWeek: formattedDays,
      startTime: startTime || '09:30',
      endTime: endTime || '12:30',
      recurrence,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date('2026-01-01'),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : new Date('2026-12-31'),
      createdBy: req.user._id,
      isActive: true,
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

    if (req.body.subject && !req.body.title) {
      req.body.title = req.body.subject;
    }
    if (req.body.dayOfWeek !== undefined && !req.body.daysOfWeek) {
      const dayName = typeof req.body.dayOfWeek === 'number' ? DAYS_MAP[req.body.dayOfWeek] : String(req.body.dayOfWeek).toUpperCase();
      if (dayName) req.body.daysOfWeek = [dayName];
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

export function getTimetableCsvTemplate(req, res) {
  const csvContent =
    'resourceName,day,startTime,endTime,subject,semester,batch,facultyName\n' +
    'Ada Lovelace Advanced Computing Lab,MONDAY,09:30,12:30,CS204 Data Structures Lab,S3 CSE,Batch A,Dr. Ramesh\n' +
    'Ada Lovelace Advanced Computing Lab,MONDAY,13:30,16:30,CS304 Operating Systems Lab,S5 CSE,Batch B,Prof. Priya\n' +
    'Ada Lovelace Advanced Computing Lab,WEDNESDAY,13:30,16:30,CS306 Compiler Design Lab,S6 CSE,Batch A,Dr. Anand\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="timetable_template.csv"');
  res.status(200).send(csvContent);
}

export async function uploadTimetableCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded CSV file is empty' });
    }

    const userDeptId = req.user.departmentId?._id || req.user.departmentId;
    const resources = await Resource.find({
      ...(req.user.role === 'DEPARTMENT_ADMIN' && userDeptId ? { departmentId: userDeptId } : {}),
      status: 'ACTIVE',
    });

    const resourceMap = new Map();
    resources.forEach((r) => {
      resourceMap.set(r.name.toLowerCase().trim(), r);
    });

    let addedCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rName = (row.resourcename || row.resource || '').toLowerCase().trim();
      const matchedResource = resourceMap.get(rName);

      if (!matchedResource) {
        errors.push(`Row ${i + 2}: Resource "${row.resourcename || 'unknown'}" not found in your department`);
        continue;
      }

      const day = (row.day || 'MONDAY').toUpperCase().trim();
      const startTime = (row.starttime || row.start || '09:30').trim();
      const endTime = (row.endtime || row.end || '12:30').trim();
      const subject = (row.subject || row.title || 'Academic Class').trim();
      const semester = (row.semester || '').trim();
      const batch = (row.batch || 'All').trim();
      const faculty = (row.facultyname || row.faculty || '').trim();

      await TimetableEntry.create({
        resourceId: matchedResource._id,
        title: subject,
        semester,
        batch,
        facultyName: faculty,
        daysOfWeek: [day],
        startTime,
        endTime,
        recurrence: 'WEEKLY',
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
        createdBy: req.user._id,
        isActive: true,
      });

      addedCount++;
    }

    return res.json({
      success: true,
      message: `Successfully imported ${addedCount} timetable entries${errors.length > 0 ? ` (${errors.length} skipped)` : ''}`,
      addedCount,
      errors,
    });
  } catch (err) {
    next(err);
  }
}
