import { Router } from 'express';
import multer from 'multer';
import * as timetableController from '../controllers/timetableController.js';
import * as blockController from '../controllers/blockController.js';
import * as studentDatasetController from '../controllers/studentDatasetController.js';
import * as adminManagementController from '../controllers/adminManagementController.js';
import { authenticate, authorize } from '../middleware/authenticate.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max CSV
});

const router = Router();

// ─── Student Eligibility Dataset (Department Admin only) ────────────────────
router.get('/students/template', authenticate, authorize('DEPARTMENT_ADMIN'), studentDatasetController.getCsvTemplate);
router.get('/students', authenticate, authorize('DEPARTMENT_ADMIN'), studentDatasetController.getStudents);
router.post('/students', authenticate, authorize('DEPARTMENT_ADMIN'), studentDatasetController.addStudent);
router.post('/students/upload-csv', authenticate, authorize('DEPARTMENT_ADMIN'), upload.single('file'), studentDatasetController.uploadStudentsCsv);
router.patch('/students/:id/status', authenticate, authorize('DEPARTMENT_ADMIN'), studentDatasetController.updateStudentStatus);
router.delete('/students/:id', authenticate, authorize('DEPARTMENT_ADMIN'), studentDatasetController.deleteStudent);

// ─── Timetable management ───────────────────────────────────────────────────
router.get('/timetable/template', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), timetableController.getTimetableCsvTemplate);
router.post('/timetable/upload-csv', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), upload.single('file'), timetableController.uploadTimetableCsv);
router.patch('/timetable/:id', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), timetableController.updateTimetableEntry);
router.delete('/timetable/:id', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), timetableController.deleteTimetableEntry);

// ─── Block management ───────────────────────────────────────────────────────
router.patch('/blocks/:id', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), blockController.updateBlock);
router.delete('/blocks/:id', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), blockController.deleteBlock);

// ─── Co-Admin Management (Department Admin & Sports Admin) ─────────────────
router.get('/co-admins', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), adminManagementController.getAdmins);
router.post('/co-admins', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), adminManagementController.createAdmin);
router.delete('/co-admins/:id', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), adminManagementController.deleteAdmin);

export default router;
