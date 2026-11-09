import type { IncomingMessage } from 'node:http';
import { requestIdFor } from './logger.config';

const req = (id?: string) =>
  ({
    headers: id === undefined ? {} : { 'x-request-id': id },
  }) as IncomingMessage;

describe('requestIdFor', () => {
  it('keeps a safe incoming id', () => {
    expect(requestIdFor(req('abc-123_x.y'))).toBe('abc-123_x.y');
  });

  it.each([undefined, '', 'x'.repeat(65), 'a b', 'id\nforged-log-line'])(
    'generates a uuid for %p',
    (id) => {
      expect(requestIdFor(req(id))).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
