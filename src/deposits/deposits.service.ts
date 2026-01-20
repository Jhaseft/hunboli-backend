import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, FiatCurrency } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateDepositDto, FiatCurrencyDto } from './dto/create-deposit.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly FEE_RATE = 0.001; // 0.1%
  private readonly MIN_DEPOSIT_BOB = 10_000;

  private getPenToBobRate(): number {
    const r = Number(process.env.PEN_TO_BOB_RATE);
    if (!Number.isFinite(r) || r <= 0) {
      throw new InternalServerErrorException(
        'PEN_TO_BOB_RATE inválido o no definido',
      );
    }
    return r;
  }

  private calcRateUsed(currency: FiatCurrencyDto): number {
    return currency === FiatCurrencyDto.BOB ? 1 : this.getPenToBobRate();
  }

  private amountInBobEquivalent(
    dto: CreateDepositDto,
    rateUsed: number,
  ): number {
    return dto.currency === FiatCurrencyDto.BOB
      ? dto.amount
      : dto.amount * rateUsed;
  }

  private calcExpectedBOBH(dto: CreateDepositDto, rateUsed: number): number {
    return dto.currency === FiatCurrencyDto.BOB
      ? dto.amount
      : dto.amount * rateUsed;
  }

  private calcFee(amount: number): number {
    return amount * this.FEE_RATE;
  }

  private generateReferenceCode(): string {
    return `HUN-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    if (!userId) throw new BadRequestException('Usuario no autenticado');
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Monto inválido');
    }

    const rateUsed = this.calcRateUsed(dto.currency);
    const bobEquivalent = this.amountInBobEquivalent(dto, rateUsed);

    // Mínimo: 10k Bs equivalentes
    if (bobEquivalent < this.MIN_DEPOSIT_BOB) {
      throw new BadRequestException(
        `Depósito mínimo: ${this.MIN_DEPOSIT_BOB} Bs (equivalente).`,
      );
    }

    const feeRate = this.FEE_RATE;
    const serviceFee = this.calcFee(dto.amount);
    const totalAmount = dto.amount + serviceFee; // <- tu campo en Prisma es totalAmount
    const expectedBOBH = this.calcExpectedBOBH(dto, rateUsed);

    // Convierte DTO currency -> Prisma enum (sin any)
    const currency: FiatCurrency =
      dto.currency === FiatCurrencyDto.BOB
        ? FiatCurrency.BOB
        : FiatCurrency.PEN;

    // Generar referenceCode único con reintentos
    for (let i = 0; i < 5; i++) {
      const referenceCode = this.generateReferenceCode();

      try {
        const deposit = await this.prisma.deposit.create({
          data: {
            userId,
            currency,
            amount: dto.amount,
            feeRate,
            serviceFee,
            totalAmount,
            rateUsed,
            expectedBOBH,
            referenceCode,
          },
        });

        return {
          depositId: deposit.id,
          status: deposit.status,
          referenceCode: deposit.referenceCode,
          currency: deposit.currency,
          amount: deposit.amount,
          feeRate: deposit.feeRate,
          serviceFee: deposit.serviceFee,
          totalAmount: deposit.totalAmount,
          rateUsed: deposit.rateUsed,
          expectedBOBH: deposit.expectedBOBH,
          instructions: {
            title: 'Transferencia bancaria',
            bankName: 'Banco X',
            accountName: 'HUNBOLI SRL',
            accountNumber: '123456789',
            note: `Usa esta referencia en el pago: ${deposit.referenceCode}`,
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
}
