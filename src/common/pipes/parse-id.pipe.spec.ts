import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('parses %s', (raw, expected) => {
    expect(pipe.transform(raw)).toBe(expected);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '1e3', '2147483648', '99999999999'])(
    'rejects %p with 400',
    (raw) => {
      expect(() => pipe.transform(raw)).toThrow(BadRequestException);
    },
  );
});
