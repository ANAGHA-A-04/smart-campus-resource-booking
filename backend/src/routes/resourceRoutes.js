import { Router } from 'express';
import * as resourceController from '../controllers/resourceController.js';
import * as timetableController from '../controllers/timetableController.js';
import * as blockController from '../controllers/blockController.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createResourceSchema, updateResourceSchema, resourceStatusSchema } from '../validators/resourceSchemas.js';

const router = Router();

// Public: browse resources (availability filtered by role in controller)
router.get('/', authenticate, resourceController.getResources);
router.get('/:id', authenticate, resourceController.getResourceById);
router.get('/:id/availability', authenticate, resourceController.getResourceAvailability);

// Admin only: create/update
router.post(
  '/',
  authenticate,
  authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'),
  validateRequest(createResourceSchema),
  resourceController.createResource
);
router.patch(
  '/:id',
  authenticate,
  authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'),
  validateRequest(updateResourceSchema),
  resourceController.updateResource
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'),
  validateRequest(resourceStatusSchema),
  resourceController.updateResourceStatus
);

// Timetable routes
router.get('/:resourceId/timetable', authenticate, timetableController.getTimetable);
router.post('/:resourceId/timetable', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), timetableController.createTimetableEntry);

// Block routes
router.get('/:resourceId/blocks', authenticate, blockController.getBlocks);
router.post('/:resourceId/blocks', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), blockController.createBlock);

export default router;
