import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FiatCurrency, FiatOperationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RatesService } from '../rates/rates.service';
import { CreateDepositDto, FiatCurrencyDto } from './dto/create-deposit.dto';
import { calculateDepositFees } from './fee.utils';
import { displayStatus, generateReferenceCode } from './deposit.helpers';

const MIN_DEPOSIT_BOB = new Prisma.Decimal('10000');
const RATE_LOCK_MINUTES = Number(process.env.RATE_LOCK_MINUTES ?? '30');

@Injectable()
export class DepositCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratesService: RatesService,
  ) {}

  async createDeposit(userId: string, dto: CreateDepositDto) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Monto inválido');
    }

    const amount = new Prisma.Decimal(dto.amount);
    const currency: FiatCurrency =
      dto.currency === FiatCurrencyDto.BOB ? FiatCurrency.BOB : FiatCurrency.PEN;

    // Rate lock solo para PEN
    let rateUsed: Prisma.Decimal | null = null;
    let rateSource: string | null = null;
    let rateQuotedAt: Date | null = null;
    let rateExpiresAt: Date | null = null;
    let bobEquivalent = new Prisma.Decimal('0');

    if (currency === FiatCurrency.BOB) {
      bobEquivalent = amount; // 1:1
    } else {
      const r = await this.ratesService.getPenToBobRate();
      rateUsed = r.rate;
      rateSource = r.source;
      rateQuotedAt = new Date(r.updatedAt);
      rateExpiresAt = new Date(rateQuotedAt.getTime() + RATE_LOCK_MINUTES * 60_000);
      bobEquivalent = amount.mul(rateUsed);
    }

    if (bobEquivalent.lt(MIN_DEPOSIT_BOB)) {
      throw new BadRequestException(
        `Depósito mínimo: ${MIN_DEPOSIT_BOB.toString()} Bs (equivalente).`,
      );
    }

    const company = await this.prisma.companyBankAccount.findUnique({ where: { currency } });
    if (!company) {
      throw new ConflictException(`No hay cuenta bancaria configurada para ${currency}`);
    }

    const expectedBOBH = bobEquivalent; // 1:1 con BOB (en equivalente BOB)
    const { feeRate, serviceFee, totalAmount } = calculateDepositFees({
      amount,
      bobEquivalent,
      currency,
      rateUsed,
    });

    // referenceCode único con reintentos
    for (let i = 0; i < 5; i++) {
      const referenceCode = generateReferenceCode();

      try {
        const deposit = await this.prisma.fiatOperation.create({
          data: {
            type: FiatOperationType.DEPOSIT,
            userId,
            currency,
            amount,
            feeRate,
            serviceFee,
            totalAmount,
            rateUsed,
            rateSource,
            rateQuotedAt,
            rateExpiresAt,
            referenceCode,
            deposit: { create: { expectedBOBH } },
          },
          include: { deposit: true },
        });

        return {
          depositId: deposit.id,
          status: displayStatus(deposit.status, deposit.deposit),
          referenceCode: deposit.referenceCode,
          currency: deposit.currency,

          amount: deposit.amount.toString(),
          feeRate: deposit.feeRate.toString(),
          serviceFee: deposit.serviceFee.toString(),
          totalAmount: deposit.totalAmount.toString(),

          rateUsed: deposit.rateUsed?.toString() ?? null,
          rateSource: deposit.rateSource ?? null,
          rateQuotedAt: deposit.rateQuotedAt ? deposit.rateQuotedAt.toISOString() : null,
          rateExpiresAt: deposit.rateExpiresAt ? deposit.rateExpiresAt.toISOString() : null,

          expectedBOBH: deposit.deposit?.expectedBOBH
            ? deposit.deposit.expectedBOBH.toString()
            : '0',

          instructions: {
            title: 'Transferencia bancaria',
            bankName: company.bankName,
            accountName: company.accountHolder,
            accountNumber: company.accountNumber,
            cci: company.cci ?? null,
            qrImageUrl: company.qrImageUrl ?? null,
            qrPublicId: company.qrPublicId ?? null,
            note:
              deposit.currency === 'PEN' && deposit.rateExpiresAt
                ? `Usa esta referencia en el pago: ${deposit.referenceCode}. Tipo de cambio fijado hasta: ${deposit.rateExpiresAt.toISOString()}`
                : `Usa esta referencia en el pago: ${deposit.referenceCode}`,
          },
        };
      } catch (e: unknown) {
        // P2002 = unique constraint failed (referenceCode)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }

    throw new InternalServerErrorException('No se pudo generar un referenceCode único');
  }
}
