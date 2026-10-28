import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createBookingSchema, cancelBookingSchema } from '../validators/bookingSchemas.js';
import * as timetableController from '../controllers/timetableController.js';
import * as blockController from '../controllers/blockController.js';

const router = Router();

// Student booking actions
router.post('/', authenticate, authorize('STUDENT'), validateRequest(createBookingSchema), bookingController.createBooking);
router.get('/my', authenticate, authorize('STUDENT'), bookingController.getMyBookings);
router.get('/:id', authenticate, bookingController.getBookingById);
router.post('/:id/cancel', authenticate, authorize('STUDENT'), validateRequest(cancelBookingSchema), bookingController.cancelBooking);

// Admin booking views
router.get('/admin/all', authenticate, authorize('DEPARTMENT_ADMIN', 'SPORTS_ADMIN'), bookingController.getAdminBookings);

export default router;
