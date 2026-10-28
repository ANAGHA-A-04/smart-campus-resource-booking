import { Readable } from 'stream';
import csvParser from 'csv-parser';
import EligibleStudent from '../models/EligibleStudent.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { config } from '../config/environment.js';

/**
 * Get all eligible students for the authenticated Department Admin's department
 */
export async function getStudents(req, res, next) {
  try {
    const user = req.user;
    const adminDeptId = user.departmentId?._id || user.departmentId;

    if (!adminDeptId) {
      return res.status(403).json({ success: false, message: 'Administrator has no assigned department' });
    }

    const { academicYear, status, search, page = 1, limit = 50 } = req.query;

    const query = { departmentId: adminDeptId };
    if (academicYear) query.academicYear = academicYear;
    if (status) query.eligibilityStatus = status;
    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { institutionalEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total, distinctYears] = await Promise.all([
      EligibleStudent.find(query)
        .sort({ academicYear: -1, studentId: 1 })
        .skip(skip)
        .limit(Number(limit)),
      EligibleStudent.countDocuments(query),
      EligibleStudent.distinct('academicYear', { departmentId: adminDeptId }),
    ]);

    // Check which students have registered accounts
    const studentIds = students.map((s) => s.studentId);
    const registeredUsers = await User.find({ studentId: { $in: studentIds } }).select('studentId email emailVerified accountStatus');
    const registeredMap = new Map(registeredUsers.map((u) => [u.studentId, u]));

    const enrichedStudents = students.map((s) => ({
      ...s.toObject(),
      registeredUser: registeredMap.get(s.studentId) || null,
    }));

    res.json({
      success: true,
      students: enrichedStudents,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      academicYears: distinctYears.sort().reverse(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a single student to the department dataset
 */
export async function addStudent(req, res, next) {
  try {
    const user = req.user;
    const adminDeptId = user.departmentId?._id || user.departmentId;

    if (!adminDeptId) {
      return res.status(403).json({ success: false, message: 'Administrator has no assigned department' });
    }

    const { studentId, name, institutionalEmail, academicYear } = req.body;

    if (!studentId || !name || !institutionalEmail || !academicYear) {
      return res.status(400).json({ success: false, message: 'Student ID, Name, Institutional Email, and Academic Year are required' });
    }

    // Validate email domain
    const emailDomain = institutionalEmail.split('@')[1]?.toLowerCase();
    if (!config.institutionEmailDomains.includes(emailDomain)) {
      return res.status(400).json({
        success: false,
        message: `Email must belong to institutional domains: ${config.institutionEmailDomains.join(', ')}`,
      });
    }

    const cleanStudentId = studentId.toUpperCase().trim();
    const cleanEmail = institutionalEmail.toLowerCase().trim();

    const student = await EligibleStudent.findOneAndUpdate(
      { studentId: cleanStudentId, departmentId: adminDeptId },
      {
        studentId: cleanStudentId,
        name: name.trim(),
        institutionalEmail: cleanEmail,
        departmentId: adminDeptId,
        academicYear: academicYear.trim(),
        eligibilityStatus: 'ELIGIBLE',
        addedBy: user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: `Student ${cleanStudentId} added to verified eligibility roster`,
      student,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk upload students via CSV for a specific academic year
 */
export async function uploadStudentsCsv(req, res, next) {
  try {
    const user = req.user;
    const adminDeptId = user.departmentId?._id || user.departmentId;

    if (!adminDeptId) {
      return res.status(403).json({ success: false, message: 'Administrator has no assigned department' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const academicYear = req.body.academicYear?.trim();
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic Year is required (e.g., 2023-2027)' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString('utf-8'));

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

    let addedCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // header is line 1

      // Flexible header naming
      const studentId = (row.studentid || row['student id'] || row.rollno || row['roll no'] || row.id)?.trim();
      const name = (row.name || row['full name'] || row.studentname)?.trim();
      const email = (row.institutionalemail || row.email || row['email address'])?.trim();

      if (!studentId || !name || !email) {
        errors.push({ row: rowNumber, error: 'Missing required field (studentId, name, or email)' });
        continue;
      }

      const cleanEmail = email.toLowerCase();
      const emailDomain = cleanEmail.split('@')[1];
      if (!config.institutionEmailDomains.includes(emailDomain)) {
        errors.push({
          row: rowNumber,
          studentId,
          error: `Invalid email domain (${emailDomain}). Must be: ${config.institutionEmailDomains.join(', ')}`,
        });
        continue;
      }

      const cleanStudentId = studentId.toUpperCase();

      const existing = await EligibleStudent.findOne({
        studentId: cleanStudentId,
        departmentId: adminDeptId,
      });

      if (existing) {
        existing.name = name;
        existing.institutionalEmail = cleanEmail;
        existing.academicYear = academicYear;
        existing.eligibilityStatus = 'ELIGIBLE';
        existing.addedBy = user._id;
        await existing.save();
        updatedCount++;
      } else {
        await EligibleStudent.create({
          studentId: cleanStudentId,
          name,
          institutionalEmail: cleanEmail,
          departmentId: adminDeptId,
          academicYear,
          eligibilityStatus: 'ELIGIBLE',
          addedBy: user._id,
        });
        addedCount++;
      }
    }

    res.json({
      success: true,
      message: `CSV processed successfully: ${addedCount} added, ${updatedCount} updated, ${errors.length} skipped`,
      academicYear,
      addedCount,
      updatedCount,
      skippedCount: errors.length,
      errors: errors.slice(0, 10), // return up to 10 sample errors if any
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update student eligibility status (ELIGIBLE, INELIGIBLE, GRADUATED)
 */
export async function updateStudentStatus(req, res, next) {
  try {
    const user = req.user;
    const adminDeptId = user.departmentId?._id || user.departmentId;
    const { id } = req.params;
    const { eligibilityStatus } = req.body;

    if (!['ELIGIBLE', 'INELIGIBLE', 'GRADUATED'].includes(eligibilityStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid eligibility status' });
    }

    const student = await EligibleStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    // Must belong to admin's department
    if (student.departmentId.toString() !== adminDeptId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only manage students in your assigned department' });
    }

    student.eligibilityStatus = eligibilityStatus;
    await student.save();

    // If student has an existing User account, synchronize accountStatus
    if (eligibilityStatus === 'INELIGIBLE' || eligibilityStatus === 'GRADUATED') {
      await User.findOneAndUpdate(
        { studentId: student.studentId },
        { accountStatus: eligibilityStatus === 'GRADUATED' ? 'INACTIVE' : 'SUSPENDED' }
      );
    } else if (eligibilityStatus === 'ELIGIBLE') {
      await User.findOneAndUpdate(
        { studentId: student.studentId },
        { accountStatus: 'ACTIVE' }
      );
    }

    res.json({ success: true, message: `Student status updated to ${eligibilityStatus}`, student });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove student from eligible dataset
 */
export async function deleteStudent(req, res, next) {
  try {
    const user = req.user;
    const adminDeptId = user.departmentId?._id || user.departmentId;
    const { id } = req.params;

    const student = await EligibleStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    if (student.departmentId.toString() !== adminDeptId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only manage students in your assigned department' });
    }

    await EligibleStudent.findByIdAndDelete(id);

    // Deactivate user if exists
    await User.findOneAndUpdate(
      { studentId: student.studentId },
      { accountStatus: 'INACTIVE' }
    );

    res.json({ success: true, message: `Student ${student.studentId} removed from eligibility roster` });
  } catch (err) {
    next(err);
  }
}

/**
 * Download CSV Template
 */
export function getCsvTemplate(req, res) {
  const csvContent = 'studentId,name,institutionalEmail\n2023CS001,Anand Krishna,student@ug.cusat.ac.in\n2023CS002,Sneha Nair,sneha@ug.cusat.ac.in\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_roster_template.csv"');
  res.status(200).send(csvContent);
}
