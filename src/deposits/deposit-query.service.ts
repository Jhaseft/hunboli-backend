import { BadRequestException, Injectable } from '@nestjs/common';
import { FiatOperationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ListMyDepositsQueryDto } from './dto/list-my-deposits.dto';
import { displayStatus } from './deposit.helpers';

@Injectable()
export class DepositQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyDeposits(userId: string, q: ListMyDepositsQueryDto) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');

    const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
    const cursor = q.cursor?.trim() || undefined;

    const rows = await this.prisma.fiatOperation.findMany({
      where: { userId, type: FiatOperationType.DEPOSIT },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        referenceCode: true,
        currency: true,
        status: true,

        amount: true,
        feeRate: true,
        serviceFee: true,
        totalAmount: true,

        rateUsed: true,
        rateSource: true,
        rateQuotedAt: true,
        rateExpiresAt: true,

        validatedById: true,
        validatedAt: true,

        createdAt: true,
        updatedAt: true,
        processedAt: true,

        deposit: {
          select: {
            expectedBOBH: true,
            proofUrl: true,
            proofUploadedAt: true,
            proofFileName: true,
            proofMimeType: true,
            mintTxHash: true,
            mintedAt: true,
            reviewNote: true,
            reviewedAt: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      items: items.map((d) => ({
        id: d.id,
        referenceCode: d.referenceCode,
        currency: d.currency,
        status: displayStatus(d.status, d.deposit),

        amount: d.amount.toString(),
        feeRate: d.feeRate.toString(),
        serviceFee: d.serviceFee.toString(),
        totalAmount: d.totalAmount.toString(),
        expectedBOBH: d.deposit?.expectedBOBH ? d.deposit.expectedBOBH.toString() : '0',

        rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
        rateSource: d.rateSource ?? null,
        rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
        rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,

        proofUrl: d.deposit?.proofUrl ?? null,
        proofUploadedAt: d.deposit?.proofUploadedAt
          ? d.deposit.proofUploadedAt.toISOString()
          : null,
        proofFileName: d.deposit?.proofFileName ?? null,
        proofMimeType: d.deposit?.proofMimeType ?? null,
        reviewNote: d.deposit?.reviewNote ?? null,
        reviewedAt: d.deposit?.reviewedAt ? d.deposit.reviewedAt.toISOString() : null,

        validatedById: d.validatedById ?? null,
        validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,

        mintTxHash: d.deposit?.mintTxHash ?? null,
        mintedAt: d.deposit?.mintedAt ? d.deposit.mintedAt.toISOString() : null,

        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        processedAt: d.processedAt ? d.processedAt.toISOString() : null,
      })),
      nextCursor,
      hasMore,
      limit,
    };
  }
}
