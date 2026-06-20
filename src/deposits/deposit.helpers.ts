import { FiatOperationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

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

export function generateReferenceCode(): string {
  return `HUN-${randomBytes(3).toString('hex').toUpperCase()}`;
}
