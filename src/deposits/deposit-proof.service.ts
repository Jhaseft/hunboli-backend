import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FiatOperationStatus, FiatOperationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { displayStatus } from './deposit.helpers';

@Injectable()
export class DepositProofService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadProof(userId: string, depositId: string, file: Express.Multer.File) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');
    if (!depositId) throw new BadRequestException('depositId inválido');
    if (!file) throw new BadRequestException('Archivo requerido');

    const deposit = await this.prisma.fiatOperation.findFirst({
      where: { id: depositId, type: FiatOperationType.DEPOSIT },
      include: { deposit: true },
    });

    if (!deposit || !deposit.deposit) throw new NotFoundException('Deposito no encontrado');
    if (deposit.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este depósito');
    }

    // Solo permitimos subir comprobante en estos estados
    const allowedStatuses: FiatOperationStatus[] = [
      FiatOperationStatus.PENDING,
      FiatOperationStatus.NEED_CORRECTION,
    ];
    if (!allowedStatuses.includes(deposit.status)) {
      throw new BadRequestException('No puedes subir comprobante en este estado.');
    }

    // Si PEN: el rate solo bloquea en el PRIMER envío (PENDING)
    if (
      deposit.currency === 'PEN' &&
      deposit.status === FiatOperationStatus.PENDING &&
      deposit.rateExpiresAt
    ) {
      const now = new Date();
      if (now > deposit.rateExpiresAt) {
        await this.prisma.fiatOperation.update({
          where: { id: depositId },
          data: { status: FiatOperationStatus.RATE_EXPIRED },
        });
        throw new BadRequestException('El tipo de cambio expiró. Crea un nuevo depósito.');
      }
    }

    // Validación básica de archivo (además del interceptor)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permite JPG, PNG, WEBP o PDF.');
    }

    const uploaded = await this.cloudinaryService.uploadDepositProof({
      file,
      userId,
      depositId,
      referenceCode: deposit.referenceCode,
    });

    const now = new Date();
    const shouldClearReview = deposit.status === FiatOperationStatus.NEED_CORRECTION;

    const updated = await this.prisma.fiatOperation.update({
      where: { id: depositId },
      data: {
        status: FiatOperationStatus.PROOF_SUBMITTED,
        deposit: {
          update: {
            proofUrl: uploaded.secureUrl,
            proofUploadedAt: now,
            proofFileName: file.originalname,
            proofMimeType: file.mimetype,
            ...(shouldClearReview
              ? { reviewNote: null, reviewedById: null, reviewedAt: null }
              : {}),
          },
        },
      },
      include: { deposit: true },
    });

    return {
      depositId: updated.id,
      status: displayStatus(updated.status, updated.deposit),
      proofUrl: updated.deposit?.proofUrl ?? null,
      proofUploadedAt: updated.deposit?.proofUploadedAt?.toISOString() ?? null,
      proofFileName: updated.deposit?.proofFileName ?? null,
      proofMimeType: updated.deposit?.proofMimeType ?? null,
      reviewNote: updated.deposit?.reviewNote ?? null,
      reviewedById: updated.deposit?.reviewedById ?? null,
      reviewedAt: updated.deposit?.reviewedAt
        ? updated.deposit.reviewedAt.toISOString()
        : null,
    };
  }
}
