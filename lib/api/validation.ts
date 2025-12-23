/**
 * Zod-based Request Validation Utilities
 * 
 * Usage:
 * ```typescript
 * import { validateBody, validateQuery } from '@/lib/api/validation';
 * import { z } from 'zod';
 * 
 * const CreateUserSchema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email'),
 * });
 * 
 * export default createApiHandler({
 *   POST: async (req, res, ctx) => {
 *     const body = validateBody(CreateUserSchema, req);
 *     // body is now fully typed: { name: string, email: string }
 *     return { data: { id: 1, ...body } };
 *   }
 * });
 * ```
 * 
 * Benefits:
 * - Type-safe request parsing with full TypeScript inference
 * - Automatic validation error formatting
 * - Throws ApiError on validation failure for consistent error responses
 */

import type { NextApiRequest } from "next";
import { z, type ZodSchema, type ZodError } from "zod";
import { ApiError } from "./handler";

function formatZodError(error: ZodError): string {
  const messages = error.errors.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
    return `${path}${e.message}`;
  });
  return messages.join("; ");
}

/**
 * Validates and parses the request body against a Zod schema.
 * Throws ApiError with 400 status if validation fails.
 * 
 * @param schema - Zod schema to validate against
 * @param req - Next.js API request object
 * @returns Parsed and typed body data
 * @throws ApiError if validation fails
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  req: NextApiRequest
): z.infer<T> {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ApiError(
      formatZodError(result.error),
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}

/**
 * Validates and parses query parameters against a Zod schema.
 * Throws ApiError with 400 status if validation fails.
 * 
 * @param schema - Zod schema to validate against
 * @param req - Next.js API request object
 * @returns Parsed and typed query data
 * @throws ApiError if validation fails
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  req: NextApiRequest
): z.infer<T> {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new ApiError(
      formatZodError(result.error),
      400,
      "VALIDATION_ERROR"
    );
  }
  return result.data;
}

/**
 * Non-throwing validation that returns a result object.
 * Useful when you want to handle validation errors manually.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns { success: true, data } or { success: false, error }
 */
export function safeValidate<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodError(result.error) };
}

export const commonSchemas = {
  id: z.coerce.number().int().positive(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  includeTest: z.object({
    includeTest: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  }),
};
