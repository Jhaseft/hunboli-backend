import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DepositStatus, FiatCurrency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateDepositDto, FiatCurrencyDto } from './dto/create-deposit.dto';
import { ListMyDepositsQueryDto } from './dto/list-my-deposits.dto';
import { randomBytes } from 'crypto';
import { RatesService } from '../rates/rates.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratesService: RatesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private readonly FEE_RATE = new Prisma.Decimal('0.001'); // 0.1%
  private readonly MIN_DEPOSIT_BOB = new Prisma.Decimal('10000'); // 10k Bs (equivalente)
  private readonly RATE_LOCK_MINUTES = Number(
    process.env.RATE_LOCK_MINUTES ?? '30',
  );

  private generateReferenceCode(): string {
    return `HUN-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Monto inválido');
    }

    const amount = new Prisma.Decimal(dto.amount);

    // fee / total en Decimal
    const feeRate = this.FEE_RATE;
    const serviceFee = amount.mul(feeRate);
    const totalAmount = amount.add(serviceFee);

    // DTO currency -> Prisma enum
    const currency: FiatCurrency =
      dto.currency === FiatCurrencyDto.BOB
        ? FiatCurrency.BOB
        : FiatCurrency.PEN;

    // Rate lock SOLO para PEN
    let rateUsed: Prisma.Decimal | null = null; // PEN->BOB
    let rateSource: string | null = null;
    let rateQuotedAt: Date | null = null;
    let rateExpiresAt: Date | null = null;

    let bobEquivalent = new Prisma.Decimal('0');

    if (currency === FiatCurrency.BOB) {
      bobEquivalent = amount; // 1:1
    } else {
      const r = this.ratesService.getPenToBobRate(); // { rate: Decimal, source, updatedAt, cacheSeconds }

      rateUsed = r.rate;
      rateSource = r.source;

      rateQuotedAt = new Date();
      rateExpiresAt = new Date(
        rateQuotedAt.getTime() + this.RATE_LOCK_MINUTES * 60_000,
      );

      bobEquivalent = amount.mul(rateUsed);
    }

    // Mínimo: 10k Bs equivalentes
    if (bobEquivalent.lt(this.MIN_DEPOSIT_BOB)) {
      throw new BadRequestException(
        `Depósito mínimo: ${this.MIN_DEPOSIT_BOB.toString()} Bs (equivalente).`,
      );
    }

    const expectedBOBH = bobEquivalent; // 1:1 con BOB (en equivalente BOB)

    // referenceCode único con reintentos
    for (let i = 0; i < 5; i++) {
      const referenceCode = this.generateReferenceCode();

      try {
        const deposit = await this.prisma.deposit.create({
          data: {
            userId,
            currency,
            amount,
            feeRate,
            serviceFee,
            totalAmount,

            // rate lock
            rateUsed,
            rateSource,
            rateQuotedAt,
            rateExpiresAt,

            expectedBOBH,
            referenceCode,
            // status default: PENDING
          },
        });

        return {
          depositId: deposit.id,
          status: deposit.status,
          referenceCode: deposit.referenceCode,
          currency: deposit.currency,

          amount: deposit.amount.toString(),
          feeRate: deposit.feeRate.toString(),
          serviceFee: deposit.serviceFee.toString(),
          totalAmount: deposit.totalAmount.toString(),

          rateUsed: deposit.rateUsed?.toString() ?? null,
          rateSource: deposit.rateSource ?? null,
          rateQuotedAt: deposit.rateQuotedAt
            ? deposit.rateQuotedAt.toISOString()
            : null,
          rateExpiresAt: deposit.rateExpiresAt
            ? deposit.rateExpiresAt.toISOString()
            : null,

          expectedBOBH: deposit.expectedBOBH.toString(),

          instructions: {
            title: 'Transferencia bancaria',
            bankName: 'Banco X',
            accountName: 'HUNBOLI SRL',
            accountNumber: '123456789',
            note:
              deposit.currency === 'PEN' && deposit.rateExpiresAt
                ? `Usa esta referencia en el pago: ${deposit.referenceCode}. Tipo de cambio fijado hasta: ${deposit.rateExpiresAt.toISOString()}`
                : `Usa esta referencia en el pago: ${deposit.referenceCode}`,
          },
        };
      } catch (e: unknown) {
        // P2002 = unique constraint failed (referenceCode)
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2002') continue;
        }
        throw e;
      }
    }

    throw new InternalServerErrorException(
      'No se pudo generar un referenceCode único',
    );
  }

  // método para subir comprobante
  async uploadProof(userId: string, depositId: string, file: Express.Multer.File) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');
    if (!depositId) throw new BadRequestException('depositId inválido');
    if (!file) throw new BadRequestException('Archivo requerido');

    const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException('Depósito no encontrado');
    if (deposit.userId !== userId)
      throw new ForbiddenException('No tienes acceso a este depósito');

    // Si PEN y el rate expiró, marcamos RATE_EXPIRED y no aceptamos comprobante
    if (deposit.currency === 'PEN' && deposit.rateExpiresAt) {
      const now = new Date();
      if (now > deposit.rateExpiresAt) {
        await this.prisma.deposit.update({
          where: { id: depositId },
          data: { status: DepositStatus.RATE_EXPIRED },
        });
        throw new BadRequestException(
          'El tipo de cambio expiró. Crea un nuevo depósito.',
        );
      }
    }

    // Estados donde NO aceptamos comprobante
    if (
      deposit.status === DepositStatus.REJECTED ||
      deposit.status === DepositStatus.MINTED
    ) {
      throw new BadRequestException(
        'No puedes subir comprobante en este estado.',
      );
    }


    // Validación básica de archivo (además del interceptor)
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permite JPG, PNG, WEBP o PDF.');
    }

    const uploaded = await this.cloudinaryService.uploadDepositProof({
      file,
      userId,
      depositId,
      referenceCode: deposit.referenceCode,
    });

    const updated = await this.prisma.deposit.update({
      where: { id: depositId },
      data: {
        proofUrl: uploaded.secureUrl,
        proofUploadedAt: new Date(),
        proofFileName: file.originalname,
        proofMimeType: file.mimetype,
        status: DepositStatus.PROOF_SUBMITTED,
      },
    });

    return {
      depositId: updated.id,
      status: updated.status,
      proofUrl: updated.proofUrl,
      proofUploadedAt: updated.proofUploadedAt?.toISOString() ?? null,
      proofFileName: updated.proofFileName ?? null,
      proofMimeType: updated.proofMimeType ?? null,
    };
  }

  async listMyDeposits(userId: string, q: ListMyDepositsQueryDto) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');

    const limit = Math.min(Math.max(q.limit ?? 10, 1), 50);
    const cursor = q.cursor?.trim() || undefined;

    const rows = await this.prisma.deposit.findMany({
      where: { userId },
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
        updatedAt: true,
        processedAt: true,
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
        status: d.status,

        amount: d.amount.toString(),
        feeRate: d.feeRate.toString(),
        serviceFee: d.serviceFee.toString(),
        totalAmount: d.totalAmount.toString(),
        expectedBOBH: d.expectedBOBH.toString(),

        rateUsed: d.rateUsed ? d.rateUsed.toString() : null,
        rateSource: d.rateSource ?? null,
        rateQuotedAt: d.rateQuotedAt ? d.rateQuotedAt.toISOString() : null,
        rateExpiresAt: d.rateExpiresAt ? d.rateExpiresAt.toISOString() : null,

        proofUrl: d.proofUrl ?? null,
        proofUploadedAt: d.proofUploadedAt
          ? d.proofUploadedAt.toISOString()
          : null,
        proofFileName: d.proofFileName ?? null,
        proofMimeType: d.proofMimeType ?? null,

        validatedById: d.validatedById ?? null,
        validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,

        mintTxHash: d.mintTxHash ?? null,
        mintedAt: d.mintedAt ? d.mintedAt.toISOString() : null,

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
