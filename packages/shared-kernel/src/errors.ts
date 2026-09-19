export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TENANT_REQUIRED'
  | 'INSUFFICIENT_STOCK'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static tenantRequired(): AppError {
    return new AppError('TENANT_REQUIRED', 'tenant_id is required', 400);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  /** HR / RBAC — thiếu permission cụ thể (ADR-006). */
  static forbiddenPermission(permission: string, message?: string): AppError {
    return new AppError('FORBIDDEN', message || `Missing permission: ${permission}`, 403, {
      reason: 'FORBIDDEN_PERMISSION',
      permission,
    });
  }

  static notFound(message = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION', message, 400, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError('CONFLICT', message, 409, details);
  }

  static insufficientStock(message = 'Insufficient stock', details?: unknown): AppError {
    return new AppError('INSUFFICIENT_STOCK', message, 409, details);
  }

  static idempotencyConflict(message = 'Idempotency key reuse with different payload'): AppError {
    return new AppError('IDEMPOTENCY_CONFLICT', message, 409);
  }
}
