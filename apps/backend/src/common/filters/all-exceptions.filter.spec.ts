import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  const filter = new AllExceptionsFilter();

  beforeEach(() => jest.clearAllMocks());

  it('passes a stable code through for domain errors', () => {
    filter.catch(
      new BadRequestException({
        message:
          'submitterUserId can only be changed by a user with order.update at ALL scope',
        code: 'SUBMITTER_IMMUTABLE',
      }),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        code: 'SUBMITTER_IMMUTABLE',
        error: [
          'submitterUserId can only be changed by a user with order.update at ALL scope',
        ],
      }),
    );
  });

  it('keeps the previous shape when the exception has no code', () => {
    filter.catch(new ConflictException('nope'), host);
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      success: false,
      statusCode: 409,
      error: ['nope'],
    });
    expect(body).not.toHaveProperty('code');
  });
});
