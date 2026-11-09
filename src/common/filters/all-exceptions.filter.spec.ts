import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const prismaError = (code: string, message = 'driver details') =>
  Object.assign(new Error(message), {
    name: 'PrismaClientKnownRequestError',
    code,
  });

function run(exception: unknown) {
  const json = jest.fn<void, [Record<string, unknown>]>();
  const status = jest
    .fn<{ json: typeof json }, [number]>()
    .mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/things/1' }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return {
    status: status.mock.calls[0][0],
    body: json.mock.calls[0][0],
  };
}

describe('AllExceptionsFilter', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps status and message of HttpExceptions without logging them', () => {
    const { status, body } = run(new NotFoundException('Movie not found'));

    expect(status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Movie not found',
      path: '/things/1',
    });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('joins validation messages into one string', () => {
    const { body } = run(
      new BadRequestException(['name should not be empty', 'year must be int']),
    );

    expect(body.message).toBe('name should not be empty, year must be int');
  });

  it.each([
    ['P2002', 409, 'Resource already exists'],
    ['P2003', 409, 'Operation conflicts with related resources'],
    ['P2025', 404, 'Resource not found'],
  ])(
    'maps prisma %s to %i with a generic message and a warning',
    (code, expectedStatus, expectedMessage) => {
      const { status, body } = run(prismaError(code));

      expect(status).toBe(expectedStatus);
      expect(body.message).toBe(expectedMessage);
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    },
  );

  it('never leaks the message of other prisma errors', () => {
    const { status, body } = run(
      prismaError('P2000', 'value too long for column "secret_column"'),
    );

    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret_column');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('turns unknown errors into 500 and logs the stack', () => {
    const { status, body } = run(new Error('boom'));

    expect(status).toBe(500);
    expect(body).toMatchObject({
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'GET /things/1 -> 500',
      expect.stringContaining('boom'),
    );
  });
});
