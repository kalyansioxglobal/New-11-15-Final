/**
 * Common Zod Schemas for API Validation
 * 
 * These schemas follow the VALIDATION_POLICY.md standards:
 * - IDs must be positive integers
 * - Numeric fields must be >= 0
 * - Text fields are trimmed and have max lengths
 * - Standard error shape: { error: string, detail?: string }
 */

import { z } from 'zod';

// ============================================================================
// Common Field Schemas
// ============================================================================

export const idSchema = z.coerce.number().int().positive({
  message: 'ID must be a positive integer',
});

export const ventureIdSchema = idSchema;
export const officeIdSchema = idSchema;
export const userIdSchema = idSchema;
export const hotelIdSchema = idSchema;
export const campaignIdSchema = idSchema;
export const customerIdSchema = idSchema;
export const subscriptionIdSchema = idSchema;
export const loadIdSchema = idSchema;
export const carrierIdSchema = idSchema;

export const emailSchema = z.string().email('Invalid email format').trim();

export const phoneSchema = z.string().trim().regex(
  /^\+?[\d\s\-()]+$/,
  'Invalid phone format'
).optional();

export const dateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
);

export const dateSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.date(),
]).transform((val) => {
  if (val instanceof Date) return val;
  if (val.includes('T')) return new Date(val);
  return new Date(val + 'T00:00:00.000Z');
});

// ============================================================================
// Numeric Field Schemas
// ============================================================================

export const nonNegativeNumberSchema = z.coerce.number().nonnegative({
  message: 'Value must be >= 0',
});

export const positiveNumberSchema = z.coerce.number().positive({
  message: 'Value must be > 0',
});

export const percentageSchema = z.coerce.number().min(0).max(100, {
  message: 'Percentage must be between 0 and 100',
});

export const currencySchema = z.coerce.number().nonnegative({
  message: 'Currency amount must be >= 0',
});

// ============================================================================
// Text Field Schemas
// ============================================================================

export const textFieldSchema = (maxLength: number = 2000) =>
  z.string().trim().max(maxLength, {
    message: `Text must be <= ${maxLength} characters`,
  });

export const notesSchema = textFieldSchema(2000);
export const commentSchema = textFieldSchema(1000);
export const nameSchema = z.string().trim().min(1, 'Name is required').max(255);

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.coerce.number().int().positive().optional(),
});

// ============================================================================
// Common Query Parameter Schemas
// ============================================================================

export const includeTestSchema = z.object({
  includeTest: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

export const dateRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});

export const ventureScopeSchema = z.object({
  ventureId: ventureIdSchema.optional(),
});

// ============================================================================
// Freight/Load Schemas
// ============================================================================

export const createLoadSchema = z.object({
  ventureId: ventureIdSchema,
  reference: z.string().trim().min(1, 'Reference is required').max(100).optional(),
  pickupCity: z.string().trim().min(1, 'Pickup city is required').max(100),
  pickupState: z.string().trim().length(2, 'State must be 2 letters').optional(),
  dropCity: z.string().trim().min(1, 'Drop city is required').max(100),
  dropState: z.string().trim().length(2, 'State must be 2 letters').optional(),
  pickupDate: dateSchema,
  dropDate: dateSchema,
  shipperName: z.string().trim().min(1).max(255).optional(),
  customerName: z.string().trim().min(1).max(255).optional(),
  billAmount: currencySchema.optional(),
  costAmount: currencySchema.optional(),
  miles: nonNegativeNumberSchema.optional(),
  equipment: z.string().trim().max(50).optional(),
  loadStatus: z.enum(['OPEN', 'QUOTED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'BILLED']).optional(),
  isTest: z.boolean().optional().default(false),
});

export const updateLoadSchema = createLoadSchema.partial().extend({
  id: idSchema,
});

export const loadQuerySchema = z.object({
  ventureId: ventureIdSchema.optional(),
  status: z.enum(['OPEN', 'QUOTED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'BILLED']).optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  shipperId: idSchema.optional(),
  customerId: idSchema.optional(),
  carrierId: idSchema.optional(),
  ...cursorPaginationSchema.shape,
});

// ============================================================================
// Carrier Schemas
// ============================================================================

export const createCarrierSchema = z.object({
  name: nameSchema,
  mcNumber: z.string().trim().regex(/^\d{6,7}$/, 'MC number must be 6-7 digits').optional(),
  dotNumber: z.string().trim().regex(/^\d{9}$/, 'DOT number must be 9 digits').optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  rating: percentageSchema.optional(),
  dispatcherIds: z.array(idSchema).optional(),
  ventureId: ventureIdSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

export const carrierQuerySchema = z.object({
  q: z.string().trim().optional(),
  active: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  state: z.string().trim().length(2).optional(),
  equipment: z.string().trim().optional(),
  dispatcherId: idSchema.optional(),
  ...paginationSchema.shape,
});

// ============================================================================
// Hotel Schemas
// ============================================================================

export const createHotelSchema = z.object({
  name: nameSchema,
  ventureId: ventureIdSchema,
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2).optional(),
  zipCode: z.string().trim().max(10).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  rooms: positiveNumberSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

export const hotelDailyEntrySchema = z.object({
  date: dateStringSchema,
  roomsSold: nonNegativeNumberSchema,
  roomsAvailable: positiveNumberSchema,
  roomRevenue: currencySchema,
  cash: currencySchema.optional(),
  credit: currencySchema.optional(),
  online: currencySchema.optional(),
  refund: currencySchema.optional(),
  dues: currencySchema.optional(),
  lostDues: currencySchema.optional(),
  otherRevenue: currencySchema.optional(),
});

// ============================================================================
// BPO Schemas
// ============================================================================

export const createBpoCallLogSchema = z.object({
  agentId: idSchema,
  ventureId: ventureIdSchema,
  officeId: idSchema.optional(),
  campaignId: idSchema.optional(),
  callStartedAt: dateSchema,
  callEndedAt: dateSchema.optional(),
  dialCount: nonNegativeNumberSchema.optional().default(1),
  isConnected: z.boolean().optional().default(false),
  appointmentSet: z.boolean().optional().default(false),
  dealWon: z.boolean().optional().default(false),
  revenue: currencySchema.optional().default(0),
  notes: notesSchema.optional(),
  isTest: z.boolean().optional().default(false),
});

export const bpoCallLogQuerySchema = z.object({
  agentId: idSchema.optional(),
  ventureId: ventureIdSchema.optional(),
  campaignId: idSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  isConnected: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  dealWon: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  ...cursorPaginationSchema.shape,
});

// ============================================================================
// EOD Report Schemas
// ============================================================================

export const createEodReportSchema = z.object({
  ventureId: ventureIdSchema,
  officeId: idSchema.optional(),
  date: dateStringSchema,
  tasksCompleted: nonNegativeNumberSchema.optional().default(0),
  loadsCovered: nonNegativeNumberSchema.optional().default(0),
  notes: notesSchema.optional(),
  metrics: z.record(z.any()).optional(), // Flexible metrics object
});

// ============================================================================
// Task Schemas
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: notesSchema.optional(),
  assignedToId: userIdSchema.optional(),
  ventureId: ventureIdSchema,
  officeId: idSchema.optional(),
  dueDate: dateSchema.optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().default('PENDING'),
  metadata: z.record(z.any()).optional(),
});

export const taskQuerySchema = z.object({
  ventureId: ventureIdSchema.optional(),
  officeId: idSchema.optional(),
  assignedToId: userIdSchema.optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  ...paginationSchema.shape,
});

// ============================================================================
// Incentive Schemas
// ============================================================================

export const incentiveCommitSchema = z.object({
  planId: idSchema,
  date: dateStringSchema,
});

export const incentiveSimulateSchema = z.object({
  ventureId: ventureIdSchema,
  date: dateStringSchema,
  rules: z.array(z.any()).optional(), // Complex rule structure
});

// ============================================================================
// Export all schemas
// ============================================================================

export const schemas = {
  // Common
  id: idSchema,
  ventureId: ventureIdSchema,
  email: emailSchema,
  phone: phoneSchema,
  date: dateSchema,
  dateString: dateStringSchema,
  pagination: paginationSchema,
  cursorPagination: cursorPaginationSchema,
  
  // Freight
  createLoad: createLoadSchema,
  updateLoad: updateLoadSchema,
  loadQuery: loadQuerySchema,
  createCarrier: createCarrierSchema,
  carrierQuery: carrierQuerySchema,
  
  // Hotels
  createHotel: createHotelSchema,
  hotelDailyEntry: hotelDailyEntrySchema,
  
  // BPO
  createBpoCallLog: createBpoCallLogSchema,
  bpoCallLogQuery: bpoCallLogQuerySchema,
  
  // Operations
  createEodReport: createEodReportSchema,
  createTask: createTaskSchema,
  taskQuery: taskQuerySchema,
  
  // Incentives
  incentiveCommit: incentiveCommitSchema,
  incentiveSimulate: incentiveSimulateSchema,
};


