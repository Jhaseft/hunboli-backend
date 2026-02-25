import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FiatOperationStatus, FiatOperationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SafeService } from '../safe/safe.service';
import { JwtUser, assertAdminOrOperator, isMinted, toMaxDecimals } from './admin-deposit.helpers';

@Injectable()
export class AdminMintProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeService: SafeService,
  ) {}

  async proposeMint(u: JwtUser, id: string) {
    assertAdminOrOperator(u);

    const op = await this.prisma.fiatOperation.findFirst({
      where: { id, type: FiatOperationType.DEPOSIT },
      include: {
        user: { select: { walletAddress: true } },
        deposit: true,
      },
    });

    if (!op || !op.deposit) throw new NotFoundException('Deposito no encontrado');

    // 1) No tocar si ya minteado/final
    if (isMinted(op.status, op.deposit)) {
      throw new BadRequestException('Este depósito ya fue minteado/procesado.');
    }

    // 2) Debe estar aprobado (recomendación)
    if (op.status !== FiatOperationStatus.APPROVED) {
      throw new BadRequestException('Solo se puede proponer mint cuando el depósito está APPROVED.');
    }

    // 3) Debe existir comprobante (ustedes decidieron exigirlo siempre)
    if (!op.deposit.proofUrl) {
      throw new BadRequestException('No se puede proponer mint sin comprobante.');
    }

    // 4) Wallet del usuario obligatoria
    const to = op.user.walletAddress;
    if (!to) throw new BadRequestException('El usuario no tiene wallet registrada.');

    // 5) Evitar duplicados
    if (op.deposit.safeTxHash) {
      throw new BadRequestException('Este depósito ya tiene un mint propuesto en Safe.');
    }

    // 6) Monto: expectedBOBH -> string con max 6 decimales
    const amount6 = toMaxDecimals(op.deposit.expectedBOBH.toString(), 6);

    // 7) Llamada a Safe
    const safeTxHash = await this.safeService.proposeMintTransaction(to, amount6);

    // 8) Guardar safeTxHash en deposit_details
    const updated = await this.prisma.fiatOperation.update({
      where: { id: op.id },
      data: {
        deposit: {
          update: {
            safeTxHash,
            safeProposedAt: new Date(),
          },
        },
      },
      include: { deposit: true },
    });

    return {
      depositId: updated.id,
      safeTxHash,
      safeProposedAt: updated.deposit?.safeProposedAt?.toISOString() ?? null,
    };
  }
}
