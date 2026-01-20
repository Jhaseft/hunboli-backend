import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma, FiatCurrency } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { CreateDepositDto, FiatCurrencyDto } from "./dto/create-deposit.dto";
import { randomBytes } from "crypto";
import { RatesService } from "../rates/rates.service";

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratesService: RatesService
  ) {}

  private readonly FEE_RATE = new Prisma.Decimal("0.001"); // 0.1%
  private readonly MIN_DEPOSIT_BOB = new Prisma.Decimal("10000");
  private readonly RATE_LOCK_MINUTES = Number(process.env.RATE_LOCK_MINUTES ?? "30");

  private generateReferenceCode(): string {
    return `HUN-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    if (!userId) throw new BadRequestException("Usuario no autenticado");
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException("Monto inválido");
    }

    const amount = new Prisma.Decimal(dto.amount);

    // fee / total en Decimal
    const feeRate = this.FEE_RATE;
    const serviceFee = amount.mul(feeRate);
    const totalAmount = amount.add(serviceFee);

    // Convierte DTO currency -> Prisma enum
    const currency: FiatCurrency =
      dto.currency === FiatCurrencyDto.BOB ? FiatCurrency.BOB : FiatCurrency.PEN;

    // Rate lock
    let rateUsed = new Prisma.Decimal("1"); // OBLIGATORIO en tu schema (BOB=1)
    let rateSource: string | null = null;
    let rateQuotedAt: Date | null = null;
    let rateExpiresAt: Date | null = null;

    let bobEquivalent = new Prisma.Decimal("0");

    if (currency === FiatCurrency.BOB) {
      bobEquivalent = amount;
    } else {
      const r = await this.ratesService.getPenToBobRate(); // Decimal
      rateUsed = r.rate;
      rateSource = r.source;
      rateQuotedAt = new Date();
      rateExpiresAt = new Date(rateQuotedAt.getTime() + this.RATE_LOCK_MINUTES * 60_000);

      bobEquivalent = amount.mul(rateUsed);
    }

    // Mínimo: 10k Bs equivalentes
    if (bobEquivalent.lt(this.MIN_DEPOSIT_BOB)) {
      throw new BadRequestException(
        `Depósito mínimo: ${this.MIN_DEPOSIT_BOB.toString()} Bs (equivalente).`
      );
    }

    const expectedBOBH = bobEquivalent; // 1:1 con BOB

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

            rateUsed,       // siempre se guarda (BOB=1, PEN=rate)
            rateSource,
            rateQuotedAt,
            rateExpiresAt,

            expectedBOBH,
            referenceCode,
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

          rateUsed: deposit.rateUsed.toString(),
          rateSource: deposit.rateSource ?? null,
          rateQuotedAt: deposit.rateQuotedAt ? deposit.rateQuotedAt.toISOString() : null,
          rateExpiresAt: deposit.rateExpiresAt ? deposit.rateExpiresAt.toISOString() : null,

          expectedBOBH: deposit.expectedBOBH.toString(),

          instructions: {
            title: "Transferencia bancaria",
            bankName: "Banco X",
            accountName: "HUNBOLI SRL",
            accountNumber: "123456789",
            note:
              deposit.currency === "PEN" && deposit.rateExpiresAt
                ? `Usa esta referencia en el pago: ${deposit.referenceCode}. Tipo de cambio fijado hasta: ${deposit.rateExpiresAt.toISOString()}`
                : `Usa esta referencia en el pago: ${deposit.referenceCode}`,
          },
        };
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002") continue;
        }
        throw e;
      }
    }

    throw new InternalServerErrorException("No se pudo generar un referenceCode único");
  }
}
