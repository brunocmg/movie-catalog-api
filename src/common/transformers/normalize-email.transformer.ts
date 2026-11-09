import { Transform } from 'class-transformer';

/**
 * Trims and lower-cases an e-mail before validation, so the same address
 * typed with different casing maps to a single account.
 */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
