import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FiatOperationStatus, FiatOperationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AdminDecisionDto, AdminDecisionAction } from './dto/decision.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';
import { JwtUser, assertAdminOrOperator, isMinted } from './admin-deposit.helpers';

@Injectable()
export class AdminDepositReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async decide(u: JwtUser, id: string, dto: AdminDecisionDto) {
    assertAdminOrOperator(u);

    const deposit = await this.prisma.fiatOperation.findFirst({
      where: { id, type: FiatOperationType.DEPOSIT },
      include: {
        deposit: true,
        user: { select: { walletAddress: true } },
      },
    });
    if (!deposit || !deposit.deposit) throw new NotFoundException('Deposito no encontrado');

    // No tocar si ya final
    if (isMinted(deposit.status, deposit.deposit)) {
      throw new BadRequestException('Este depósito ya fue minteado.');
    }

    const allowedForReject: FiatOperationStatus[] = [
      FiatOperationStatus.PROOF_SUBMITTED,
      FiatOperationStatus.NEED_CORRECTION,
    ];

    if (dto.action === AdminDecisionAction.APPROVE) {
      if (deposit.status !== FiatOperationStatus.PROOF_SUBMITTED) {
        throw new BadRequestException('Solo se puede aprobar cuando está en PROOF_SUBMITTED.');
      }
    }

    if (dto.action === AdminDecisionAction.REJECT) {
      if (!allowedForReject.includes(deposit.status)) {
        throw new BadRequestException('Solo se puede rechazar desde PROOF_SUBMITTED o NEED_CORRECTION.');
      }
    }

    // Exigir comprobante para aprobar
    if (dto.action === AdminDecisionAction.APPROVE && !deposit.deposit.proofUrl) {
      throw new BadRequestException('No se puede aprobar sin comprobante.');
    }

    // Si PEN: solo invalidar si el proof se subió DESPUÉS del vencimiento
    if (
      dto.action === AdminDecisionAction.APPROVE &&
      deposit.currency === 'PEN' &&
      deposit.rateExpiresAt &&
      deposit.deposit.proofUploadedAt &&
      deposit.deposit.proofUploadedAt > deposit.rateExpiresAt
    ) {
      await this.prisma.fiatOperation.update({
        where: { id },
        data: { status: FiatOperationStatus.RATE_EXPIRED },
      });
      throw new BadRequestException('El comprobante se subió después de que expiró el tipo de cambio.');
    }

    const newStatus =
      dto.action === AdminDecisionAction.APPROVE
        ? FiatOperationStatus.APPROVED
        : FiatOperationStatus.REJECTED;

    const updated = await this.prisma.fiatOperation.update({
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

  async requestCorrection(u: JwtUser, id: string, dto: RequestCorrectionDto) {
    assertAdminOrOperator(u);

    const op = await this.prisma.fiatOperation.findFirst({
      where: { id, type: FiatOperationType.DEPOSIT },
      include: { deposit: true },
    });

    if (!op || !op.deposit) throw new NotFoundException('Operación no encontrada');

    // 1) No tocar si ya está final/minteado
    if (isMinted(op.status, op.deposit)) {
      throw new BadRequestException('Este depósito ya fue minteado.');
    }

    // 2) Solo tiene sentido si ya existe proof para revisar
    if (!op.deposit.proofUrl) {
      throw new BadRequestException('No hay comprobante para revisar.');
    }

    // 3) Solo desde PROOF_SUBMITTED
    if (op.status !== FiatOperationStatus.PROOF_SUBMITTED) {
      throw new BadRequestException('Solo puedes solicitar corrección desde PROOF_SUBMITTED.');
    }

    const updated = await this.prisma.fiatOperation.update({
      where: { id },
      data: {
        status: FiatOperationStatus.NEED_CORRECTION,
        deposit: {
          update: {
            reviewNote: dto.note,
            reviewedById: u.userId,
            reviewedAt: new Date(),
          },
        },
      },
      select: {
        id: true,
        status: true,
        deposit: {
          select: {
            reviewNote: true,
            reviewedById: true,
            reviewedAt: true,
          },
        },
      },
    });

    return {
      depositId: updated.id,
      status: updated.status,
      reviewNote: updated.deposit?.reviewNote ?? null,
      reviewedById: updated.deposit?.reviewedById ?? null,
      reviewedAt: updated.deposit?.reviewedAt ? updated.deposit.reviewedAt.toISOString() : null,
    };
  }
}
