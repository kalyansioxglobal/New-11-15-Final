/**
 * Centralized API Utilities
 * 
 * This module provides standardized patterns for API route development:
 * - createApiHandler: Wrapper with error handling and auth
 * - validateBody/validateQuery: Zod-based request validation
 * - ApiError: Structured error class for consistent responses
 * 
 * See handler.ts and validation.ts for detailed usage examples.
 */

export { createApiHandler, ApiError, type ApiContext, type ApiResponse } from "./handler";
export { validateBody, validateQuery, safeValidate, commonSchemas } from "./validation";
