import { Injectable, NotFoundException } from '@nestjs/common';
import { FiatOperationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ListAdminDepositsQueryDto, AdminDepositStatusFilter } from './dto/list-admin-deposits.dto';
import { FiatOperationStatus } from '@prisma/client';
import { JwtUser, assertAdminOrOperator, displayStatus } from './admin-deposit.helpers';

@Injectable()
export class AdminDepositQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(u: JwtUser, q: ListAdminDepositsQueryDto) {
    assertAdminOrOperator(u);

    const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
    const cursor = q.cursor?.trim() || undefined;

    const where: Prisma.FiatOperationWhereInput = {
      type: FiatOperationType.DEPOSIT,
    };

    const status = q.status ?? AdminDepositStatusFilter.PROOF_SUBMITTED;
    if (status !== AdminDepositStatusFilter.ALL) {
      if (status === AdminDepositStatusFilter.MINTED) {
        where.OR = [
          { status: FiatOperationStatus.PROCESSED },
          { deposit: { mintedAt: { not: null } } },
          { deposit: { mintTxHash: { not: null } } },
        ];
      } else {
        where.status = status as unknown as FiatOperationStatus;
      }
    }

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

        amount: true,
        totalAmount: true,

        rateUsed: true,
        rateSource: true,
        rateQuotedAt: true,
        rateExpiresAt: true,

        validatedById: true,
        validatedAt: true,

        createdAt: true,

        deposit: {
          select: {
            expectedBOBH: true,
            proofUrl: true,
            proofUploadedAt: true,
            proofFileName: true,
            proofMimeType: true,
            safeTxHash: true,
            safeProposedAt: true,
            mintTxHash: true,
            mintedAt: true,
            reviewNote: true,
            reviewedById: true,
            reviewedAt: true,
          },
        },

        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            country: true,
            kycStatus: true,
            walletAddress: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((d) => {
        const ds = displayStatus(d.status, d.deposit);
        const isRateExpired =
          d.currency === 'PEN' &&
          !!d.rateExpiresAt &&
          !!d.deposit?.proofUploadedAt &&
          d.deposit.proofUploadedAt > d.rateExpiresAt &&
          ds !== 'MINTED';

        return {
          id: d.id,
          referenceCode: d.referenceCode,
          currency: d.currency,
          status: ds,
          isRateExpired,

          amount: d.amount.toString(),
          totalAmount: d.totalAmount.toString(),
          expectedBOBH: d.deposit?.expectedBOBH ? d.deposit.expectedBOBH.toString() : '0',

          rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
          rateSource: d.rateSource ?? null,
          rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
          rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,

          proofUrl: d.deposit?.proofUrl ?? null,
          proofUploadedAt: d.deposit?.proofUploadedAt ? d.deposit.proofUploadedAt.toISOString() : null,
          proofFileName: d.deposit?.proofFileName ?? null,
          proofMimeType: d.deposit?.proofMimeType ?? null,

          safeTxHash: d.deposit?.safeTxHash ?? null,
          safeProposedAt: d.deposit?.safeProposedAt ? d.deposit.safeProposedAt.toISOString() : null,

          validatedById: d.validatedById ?? null,
          validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,

          mintTxHash: d.deposit?.mintTxHash ?? null,
          mintedAt: d.deposit?.mintedAt ? d.deposit.mintedAt.toISOString() : null,

          reviewNote: d.deposit?.reviewNote ?? null,
          reviewedById: d.deposit?.reviewedById ?? null,
          reviewedAt: d.deposit?.reviewedAt ? d.deposit.reviewedAt.toISOString() : null,

          createdAt: d.createdAt.toISOString(),

          user: d.user,
        };
      }),
      nextCursor,
      hasMore,
      limit,
      filter: status,
    };
  }

  async getOne(u: JwtUser, id: string) {
    assertAdminOrOperator(u);

    const d = await this.prisma.fiatOperation.findFirst({
      where: { id, type: FiatOperationType.DEPOSIT },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            country: true,
            kycStatus: true,
            walletAddress: true,
          },
        },
        deposit: true,
      },
    });
    if (!d) throw new NotFoundException('Deposito no encontrado');
    if (!d.deposit) throw new NotFoundException('Deposito no encontrado');

    const ds = displayStatus(d.status, d.deposit);

    return {
      id: d.id,
      referenceCode: d.referenceCode,
      currency: d.currency,
      status: ds,
      userId: d.userId,

      amount: d.amount.toString(),
      feeRate: d.feeRate.toString(),
      serviceFee: d.serviceFee.toString(),
      totalAmount: d.totalAmount.toString(),
      expectedBOBH: d.deposit.expectedBOBH.toString(),
      rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
      rateSource: d.rateSource ?? null,
      rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      processedAt: d.processedAt ? d.processedAt.toISOString() : null,
      validatedById: d.validatedById ?? null,
      validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,
      mintedAt: d.deposit.mintedAt ? d.deposit.mintedAt.toISOString() : null,
      mintTxHash: d.deposit.mintTxHash ?? null,
      proofUrl: d.deposit.proofUrl ?? null,
      proofUploadedAt: d.deposit.proofUploadedAt ? d.deposit.proofUploadedAt.toISOString() : null,
      proofFileName: d.deposit.proofFileName ?? null,
      proofMimeType: d.deposit.proofMimeType ?? null,
      rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,
      reviewNote: d.deposit.reviewNote ?? null,
      reviewedById: d.deposit.reviewedById ?? null,
      reviewedAt: d.deposit.reviewedAt ? d.deposit.reviewedAt.toISOString() : null,

      user: d.user,
      transactions: [],
    };
  }
}
