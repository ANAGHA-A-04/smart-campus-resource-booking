import { z } from 'zod';

export const createResourceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    type: z.enum(['CLASSROOM', 'LABORATORY', 'EQUIPMENT', 'SPORTS_FACILITY', 'SEMINAR_HALL']),
    location: z.string().max(200).trim().optional().default(''),
    description: z.string().max(1000).trim().optional().default(''),
    accessPolicy: z.enum(['DEPARTMENT_ONLY', 'ALL_DEPARTMENTS', 'RESTRICTED']),
    allowedDepartmentIds: z.array(z.string()).optional().default([]),
    bookingEnabled: z.boolean().optional().default(true),
    bookingRules: z.object({
      minDurationMinutes: z.number().min(15).max(480).optional(),
      maxDurationMinutes: z.number().min(15).max(480).optional(),
      advanceBookingDays: z.number().min(1).max(365).optional(),
      cancellationHours: z.number().min(0).max(72).optional(),
      slotDurationMinutes: z.number().min(15).max(240).optional().nullable(),
    }).optional(),
    operatingHours: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
      isClosed: z.boolean().optional().default(false),
    })).optional().default([]),
  }),
});

export const updateResourceSchema = z.object({
  body: createResourceSchema.shape.body.partial(),
  params: z.object({ id: z.string() }),
});

export const resourceStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
  params: z.object({ id: z.string() }),
});
