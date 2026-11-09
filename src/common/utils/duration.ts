const UNIT_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
} as const;

export const DURATION_PATTERN = /^(\d+)\s*(ms|s|m|h|d|w|y)?$/i;

// a bare number means seconds (jsonwebtoken would read "900" as 900 ms)
export function parseDurationMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: "${value}"`);

  const amount = Number(match[1]);
  const unit = (match[2]?.toLowerCase() ?? 's') as keyof typeof UNIT_MS;

  return amount * UNIT_MS[unit];
}
