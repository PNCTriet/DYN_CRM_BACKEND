import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const payload =
      typeof body === 'string' ? { message: body } : (body as {
        message?: string | string[];
        code?: unknown;
      });
    const message = payload.message ?? 'Error';
    const code = typeof payload.code === 'string' ? payload.code : undefined;

    res.status(status).json({
      success: false,
      statusCode: status,
      ...(code ? { code } : {}),
      error: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
    });
  }
}
