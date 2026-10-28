import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    resourceId: z.string().min(1, 'Resource is required'),
    startTime: z.string().datetime('Invalid start time'),
    endTime: z.string().datetime('Invalid end time'),
    purpose: z.string().min(5, 'Please describe the purpose of your booking').max(500).trim(),
  }).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  }),
});

export const cancelBookingSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    reason: z.string().max(500).trim().optional(),
  }),
});
