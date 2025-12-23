/**
 * Shared API Response Types
 * 
 * Use these types for consistent API response shapes across the application.
 */

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type DateRangeParams = {
  startDate?: string;
  endDate?: string;
};

export type TestModeParams = {
  includeTest?: boolean;
};
