import Resource from '../models/Resource.js';
import { getAvailabilityForDate, getAvailabilityForWeek } from '../services/availabilityService.js';

export async function getResources(req, res, next) {
  try {
    const { type, departmentId, accessPolicy, status, search, page = 1, limit = 20 } = req.query;
    const query = { status: 'ACTIVE', bookingEnabled: true };
    if (type) query.type = type;
    if (departmentId) query.departmentId = departmentId;
    if (accessPolicy) query.accessPolicy = accessPolicy;
    if (search) query.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('departmentId', 'name code')
        .populate('allowedDepartmentIds', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Resource.countDocuments(query),
    ]);

    res.json({ success: true, resources, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
}

export async function getResourceById(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('departmentId', 'name code')
      .populate('allowedDepartmentIds', 'name code')
      .populate('createdBy', 'name');
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, resource });
  } catch (err) {
    next(err);
  }
}

export async function createResource(req, res, next) {
  try {
    const user = req.user;
    const data = req.validated.body;

    // Department admin can only create resources for their own department
    if (user.role === 'DEPARTMENT_ADMIN') {
      data.departmentId = user.departmentId._id || user.departmentId;
    }

    // Sports admin creates sports facilities without a department
    if (user.role === 'SPORTS_ADMIN') {
      data.departmentId = null;
    }

    const resource = await Resource.create({ ...data, createdBy: user._id });
    await resource.populate('departmentId', 'name code');
    res.status(201).json({ success: true, message: 'Resource created successfully', resource });
  } catch (err) {
    next(err);
  }
}

export async function updateResource(req, res, next) {
  try {
    const user = req.user;
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    // Department admin can only edit their own department's resources
    if (user.role === 'DEPARTMENT_ADMIN') {
      const adminDeptId = user.departmentId?._id?.toString() || user.departmentId?.toString();
      const resDeptId = resource.departmentId?.toString();
      if (adminDeptId !== resDeptId) {
        return res.status(403).json({ success: false, message: 'You can only manage resources in your own department' });
      }
    }

    // Sports admin can only edit sports facilities
    if (user.role === 'SPORTS_ADMIN' && resource.type !== 'SPORTS_FACILITY') {
      return res.status(403).json({ success: false, message: 'Sports administrators can only manage sports facilities' });
    }

    // Prevent department change
    const updates = { ...req.validated.body };
    delete updates.departmentId;

    const updated = await Resource.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('departmentId', 'name code');

    res.json({ success: true, message: 'Resource updated', resource: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateResourceStatus(req, res, next) {
  try {
    const user = req.user;
    const { status } = req.validated.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (user.role === 'DEPARTMENT_ADMIN') {
      const adminDeptId = user.departmentId?._id?.toString() || user.departmentId?.toString();
      if (adminDeptId !== resource.departmentId?.toString()) {
        return res.status(403).json({ success: false, message: 'You can only manage resources in your own department' });
      }
    }

    resource.status = status;
    await resource.save();
    res.json({ success: true, message: `Resource ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`, resource });
  } catch (err) {
    next(err);
  }
}

export async function getResourceAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { date, view = 'day' } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let result;
    if (view === 'week') {
      result = await getAvailabilityForWeek(id, targetDate);
    } else {
      result = await getAvailabilityForDate(id, targetDate);
    }

    res.json({ success: true, resourceId: id, date: targetDate, view, ...result });
  } catch (err) {
    next(err);
  }
}
