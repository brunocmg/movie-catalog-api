/**
 * Prisma error codes the API handles explicitly.
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
export const PrismaErrorCode = {
  UniqueConstraint: 'P2002',
  ForeignKeyConstraint: 'P2003',
  RecordNotFound: 'P2025',
} as const;

export type PrismaKnownError = {
  name: 'PrismaClientKnownRequestError';
  code: string;
  meta?: Record<string, unknown>;
};

/**
 * Structural check instead of `instanceof`, so it keeps working even if the
 * error comes from a different copy of the Prisma client.
 */
export function isPrismaKnownError(
  error: unknown,
  code?: string,
): error is PrismaKnownError {
  if (
    typeof error !== 'object' ||
    error === null ||
    (error as { name?: unknown }).name !== 'PrismaClientKnownRequestError'
  ) {
    return false;
  }

  return code === undefined || (error as { code?: unknown }).code === code;
}
