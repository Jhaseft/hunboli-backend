import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FiatOperationStatus, FiatOperationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SafeService } from '../safe/safe.service';
import { JwtUser, assertAdminOrOperator, isMinted, toMaxDecimals } from './admin-deposit.helpers';

@Injectable()
export class AdminMintProposalService {
  private readonly logger = new Logger(AdminMintProposalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safeService: SafeService,
  ) {}

  async proposeMint(u: JwtUser, id: string) {
    assertAdminOrOperator(u);

    const op = await this.prisma.fiatOperation.findFirst({
      where: { id, type: FiatOperationType.DEPOSIT },
      include: {
        user: { select: { walletAddress: true, isFirstMint: true } },
        deposit: true,
      },
    });

    if (!op || !op.deposit) throw new NotFoundException('Deposito no encontrado');

    // 1) No tocar si ya minteado/final
    if (isMinted(op.status, op.deposit)) {
      throw new BadRequestException('Este depósito ya fue minteado/procesado.');
    }

    // 2) Debe estar aprobado
    if (op.status !== FiatOperationStatus.APPROVED) {
      throw new BadRequestException('Solo se puede proponer mint cuando el depósito está APPROVED.');
    }

    // 3) Debe existir comprobante
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

    const isFirstMint = op.user.isFirstMint;

    // 7) Llamada a Safe: batch (mint + gas airdrop 0.01) si es el primer minteo, simple si no
    const safeTxHash = isFirstMint
      ? await this.safeService.proposeMintWithAirdropBatch(to, amount6)
      : await this.safeService.proposeMintTransaction(to, amount6);

    this.logger.log(
      `proposeMint: depositId=${op.id}, isFirstMint=${isFirstMint}, safeTxHash=${safeTxHash}`,
    );

    // 8) Guardar safeTxHash y marcar isFirstMint=false si aplica
    const updated = await this.prisma.fiatOperation.update({
      where: { id: op.id },
      data: {
        deposit: {
          update: {
            safeTxHash,
            safeProposedAt: new Date(),
          },
        },
        ...(isFirstMint && {
          user: {
            update: { isFirstMint: false },
          },
        }),
      },
      include: { deposit: true },
    });

    return {
      depositId: updated.id,
      safeTxHash,
      safeProposedAt: updated.deposit?.safeProposedAt?.toISOString() ?? null,
      gasAirdropIncluded: isFirstMint,
    };
  }
}
