import User from '../models/User.js';
import Department from '../models/Department.js';

/**
 * GET /api/admin/co-admins
 * List all admins across all departments and sports facilities
 */
export async function getAdmins(req, res, next) {
  try {
    const admins = await User.find({ role: { $in: ['DEPARTMENT_ADMIN', 'SPORTS_ADMIN'] } })
      .select('name email role departmentId createdAt accountStatus')
      .populate('departmentId', 'name code')
      .sort({ role: 1, createdAt: -1 });

    res.json({ success: true, admins });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/co-admins
 * Create a new admin for any department or sports directorate
 */
export async function createAdmin(req, res, next) {
  try {
    const { name, email, password, role = 'DEPARTMENT_ADMIN', departmentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const validRoles = ['DEPARTMENT_ADMIN', 'SPORTS_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be DEPARTMENT_ADMIN or SPORTS_ADMIN' });
    }

    if (role === 'DEPARTMENT_ADMIN') {
      if (!departmentId) {
        return res.status(400).json({ success: false, message: 'Department is required for a Department Administrator' });
      }
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({ success: false, message: 'Selected department does not exist' });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Check if email is already registered
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email address already exists' });
    }

    const passwordHash = await User.hashPassword(password);

    const newAdmin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      departmentId: role === 'DEPARTMENT_ADMIN' ? departmentId : null,
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });

    await newAdmin.populate('departmentId', 'name code');

    res.status(201).json({
      success: true,
      message: `${role === 'DEPARTMENT_ADMIN' ? 'Department' : 'Sports'} admin added successfully`,
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        departmentId: newAdmin.departmentId,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/co-admins/:id
 * Delete an admin across any department (except self)
 */
export async function deleteAdmin(req, res, next) {
  try {
    const targetId = req.params.id;

    // Guard: Prevent self-deletion
    if (req.user._id.toString() === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    // Find the target admin
    const targetAdmin = await User.findOne({
      _id: targetId,
      role: { $in: ['DEPARTMENT_ADMIN', 'SPORTS_ADMIN'] },
    });

    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Administrator not found' });
    }

    await targetAdmin.deleteOne();
    res.json({ success: true, message: `Administrator ${targetAdmin.name} removed successfully` });
  } catch (err) {
    next(err);
  }
}
