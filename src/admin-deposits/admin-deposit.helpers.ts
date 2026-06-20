import { ForbiddenException } from '@nestjs/common';
import { FiatOperationStatus, UserRole } from '@prisma/client';

export type JwtUser = { userId: string; role: UserRole; email?: string };

export function assertAdminOrOperator(u: JwtUser) {
  const allowed: UserRole[] = [UserRole.ADMIN, UserRole.OPERATOR_BO, UserRole.OPERATOR_PE];
  if (!u?.userId || !allowed.includes(u.role)) {
    throw new ForbiddenException('No autorizado.');
  }
}

export function isMinted(
  status: FiatOperationStatus,
  deposit: { mintedAt: Date | null; mintTxHash: string | null } | null,
): boolean {
  return (
    status === FiatOperationStatus.PROCESSED ||
    !!deposit?.mintedAt ||
    !!deposit?.mintTxHash
  );
}

export function displayStatus(
  status: FiatOperationStatus,
  deposit: { mintedAt: Date | null; mintTxHash: string | null } | null,
): string {
  return isMinted(status, deposit) ? 'MINTED' : status;
}

export function toMaxDecimals(value: string, maxDecimals: number): string {
  if (maxDecimals <= 0) {
    return value.split('.')[0];
  }

  const parts = value.split('.');
  if (parts.length === 1) {
    return value;
  }

  const [intPart, decPart] = parts;
  if (!decPart) {
    return intPart;
  }

  const trimmed = decPart.slice(0, maxDecimals);
  if (trimmed.length === 0) {
    return intPart;
  }

  return `${intPart}.${trimmed}`;
}
