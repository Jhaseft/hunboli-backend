import { Injectable } from '@nestjs/common';
import { FiatOperationStatus, FiatOperationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ListAdminMintsQueryDto } from './dto/list-admin-mints.dto';
import { JwtUser, assertAdminOrOperator, displayStatus } from './admin-deposit.helpers';

@Injectable()
export class AdminMintQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMints(u: JwtUser, q: ListAdminMintsQueryDto) {
    assertAdminOrOperator(u);

    const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
    const cursor = q.cursor?.trim() || undefined;

    const where: Prisma.FiatOperationWhereInput = {
      type: FiatOperationType.DEPOSIT,
      OR: [
        { status: FiatOperationStatus.APPROVED },
        { deposit: { safeTxHash: { not: null } } },
      ],
    };

    const rows = await this.prisma.fiatOperation.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        referenceCode: true,
        currency: true,
        status: true,
        createdAt: true,
        deposit: {
          select: {
            expectedBOBH: true,
            safeTxHash: true,
            safeProposedAt: true,
            mintTxHash: true,
            mintedAt: true,
          },
        },
        user: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((d) => ({
        id: d.id,
        referenceCode: d.referenceCode,
        currency: d.currency,
        status: displayStatus(d.status, d.deposit),
        expectedBOBH: d.deposit?.expectedBOBH ? d.deposit.expectedBOBH.toString() : '0',
        safeTxHash: d.deposit?.safeTxHash ?? null,
        safeProposedAt: d.deposit?.safeProposedAt ? d.deposit.safeProposedAt.toISOString() : null,
        mintTxHash: d.deposit?.mintTxHash ?? null,
        mintedAt: d.deposit?.mintedAt ? d.deposit.mintedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
        user: d.user,
      })),
      nextCursor,
      hasMore,
      limit,
    };
  }

  async getPendingMintsCount(u: JwtUser) {
    assertAdminOrOperator(u);

    const pendingCount = await this.prisma.fiatOperation.count({
      where: {
        type: FiatOperationType.DEPOSIT,
        OR: [
          { status: FiatOperationStatus.PROOF_SUBMITTED },
          { status: FiatOperationStatus.NEED_CORRECTION },
          { status: FiatOperationStatus.RATE_EXPIRED },
          { status: FiatOperationStatus.APPROVED },
        ],
        deposit: {
          safeTxHash: null,
          mintTxHash: null,
          mintedAt: null,
        },
      },
    });

    return { pendingCount };
  }
}
