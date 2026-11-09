import { parseDurationMs } from './duration';

describe('parseDurationMs', () => {
  it.each([
    ['900', 900_000],
    ['30s', 30_000],
    ['15m', 900_000],
    ['1h', 3_600_000],
    ['7d', 604_800_000],
    ['2w', 1_209_600_000],
    ['500ms', 500],
    [' 15M ', 900_000],
  ])('parses %p as %i ms', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it.each(['', 'forever', '1.5h', '-1h', '10 days'])('rejects %p', (input) => {
    expect(() => parseDurationMs(input)).toThrow('Invalid duration');
  });
});
