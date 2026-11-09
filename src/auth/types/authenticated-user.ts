import type { Request } from 'express';
import { Role } from '@prisma/client';

/**
 * The caller, loaded from the database on every request by AuthTokenGuard.
 * The role never comes from the token, so promotions, demotions and
 * deactivations take effect immediately.
 */
export type AuthenticatedUser = {
  id: number;
  email: string;
  role: Role;
};

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
