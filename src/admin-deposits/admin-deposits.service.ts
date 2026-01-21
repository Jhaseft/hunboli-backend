import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DepositStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AdminDecisionDto, AdminDecisionAction } from './dto/decision.dto';
import { ListAdminDepositsQueryDto, AdminDepositStatusFilter } from './dto/list-admin-deposits.dto';

type JwtUser = { userId: string; role: UserRole; email?: string };

@Injectable()
export class AdminDepositsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdminOrOperator(u: JwtUser) {
    const allowed: UserRole[] = [UserRole.ADMIN, UserRole.OPERATOR_BO, UserRole.OPERATOR_PE];
    if (!u?.userId || !allowed.includes(u.role)) {
      throw new ForbiddenException('No autorizado.');
    }
  }

  async list(u: JwtUser, q: ListAdminDepositsQueryDto) {
    this.assertAdminOrOperator(u);

    const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
    const cursor = q.cursor?.trim() || undefined;

    const where: Prisma.DepositWhereInput = {};

    const status = q.status ?? AdminDepositStatusFilter.PROOF_SUBMITTED;
    if (status !== AdminDepositStatusFilter.ALL) {
      where.status = status as unknown as DepositStatus;
    }

    const rows = await this.prisma.deposit.findMany({
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
        expectedBOBH: true,

        rateUsed: true,
        rateSource: true,
        rateQuotedAt: true,
        rateExpiresAt: true,

        proofUrl: true,
        proofUploadedAt: true,
        proofFileName: true,
        proofMimeType: true,

        validatedById: true,
        validatedAt: true,

        mintTxHash: true,
        mintedAt: true,

        createdAt: true,

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

    const now = Date.now();

    return {
      items: items.map((d) => {
        const isRateExpired =
          d.currency === 'PEN' && !!d.rateExpiresAt && now > d.rateExpiresAt.getTime() && d.status !== 'MINTED';

        return {
          id: d.id,
          referenceCode: d.referenceCode,
          currency: d.currency,
          status: d.status,
          isRateExpired,

          amount: d.amount.toString(),
          totalAmount: d.totalAmount.toString(),
          expectedBOBH: d.expectedBOBH.toString(),

          rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
          rateSource: d.rateSource ?? null,
          rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
          rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,

          proofUrl: d.proofUrl ?? null,
          proofUploadedAt: d.proofUploadedAt ? d.proofUploadedAt.toISOString() : null,
          proofFileName: d.proofFileName ?? null,
          proofMimeType: d.proofMimeType ?? null,

          validatedById: d.validatedById ?? null,
          validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,

          mintTxHash: d.mintTxHash ?? null,
          mintedAt: d.mintedAt ? d.mintedAt.toISOString() : null,

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
    this.assertAdminOrOperator(u);

    const d = await this.prisma.deposit.findUnique({
      where: { id },
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
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!d) throw new NotFoundException('Depósito no encontrado');

    return {
      ...d,
      amount: d.amount.toString(),
      feeRate: d.feeRate.toString(),
      serviceFee: d.serviceFee.toString(),
      totalAmount: d.totalAmount.toString(),
      expectedBOBH: d.expectedBOBH.toString(),
      rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      processedAt: d.processedAt ? d.processedAt.toISOString() : null,
      validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,
      mintedAt: d.mintedAt ? d.mintedAt.toISOString() : null,
      proofUploadedAt: d.proofUploadedAt ? d.proofUploadedAt.toISOString() : null,
      rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
      rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,
      transactions: d.transactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
        confirmedAt: t.confirmedAt ? t.confirmedAt.toISOString() : null,
      })),
    };
  }

  async decide(u: JwtUser, id: string, dto: AdminDecisionDto) {
    this.assertAdminOrOperator(u);

    const deposit = await this.prisma.deposit.findUnique({ where: { id } });
    if (!deposit) throw new NotFoundException('Depósito no encontrado');

    // No tocar si ya final
    if (deposit.status === DepositStatus.MINTED) {
      throw new BadRequestException('Este depósito ya fue minteado.');
    }

    // Exigir comprobante para aprobar (si quieres permitir BOB sin proof, me dices)
    if (dto.action === AdminDecisionAction.APPROVE && !deposit.proofUrl) {
      throw new BadRequestException('No se puede aprobar sin comprobante.');
    }

    // Si PEN y expiró, no permitir aprobar
    if (
      dto.action === AdminDecisionAction.APPROVE &&
      deposit.currency === 'PEN' &&
      deposit.rateExpiresAt &&
      new Date() > deposit.rateExpiresAt
    ) {
      await this.prisma.deposit.update({
        where: { id },
        data: { status: DepositStatus.RATE_EXPIRED },
      });
      throw new BadRequestException('El tipo de cambio expiró. No se puede aprobar.');
    }

    const newStatus = dto.action === AdminDecisionAction.APPROVE ? DepositStatus.APPROVED : DepositStatus.REJECTED;

    const updated = await this.prisma.deposit.update({
      where: { id },
      data: {
        status: newStatus,
        validatedById: u.userId,
        validatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        validatedById: true,
        validatedAt: true,
      },
    });

    return {
      depositId: updated.id,
      status: updated.status,
      validatedById: updated.validatedById,
      validatedAt: updated.validatedAt ? updated.validatedAt.toISOString() : null,
    };
  }
}
