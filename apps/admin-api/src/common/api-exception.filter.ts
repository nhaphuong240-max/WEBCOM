import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AppError, errorEnvelope } from '@ptt/shared-kernel';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestContext?: { correlationId?: string } }>();

    // eslint-disable-next-line no-console
    console.error('[api-error]', exception);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as { message?: string }).message ?? message;
      code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      details = { name: exception.name };
    }

    res.status(status).json(
      errorEnvelope(code, Array.isArray(message) ? message.join(', ') : String(message), {
        details,
        correlationId: req.requestContext?.correlationId,
      }),
    );
  }
}
