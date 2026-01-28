import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRetiroDto } from './dto/create-retiro.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetiroService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService) { }

  getComisionMinima(): number {
    return Number(this.config?.get('COMISION_MINIMA'));
  }

  async create(dto: CreateRetiroDto, userId: string) {

    const referenceCode = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const servicefee = this.getComisionMinima();

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: dto.bankAccountId },
      include: {
        bank: true,
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('La cuenta bancaria no existe');
    }

    const converte_amount = parseInt(dto.amount);

    if (converte_amount < 10000) {
      throw new BadRequestException('El monto es menor a 10000 BOBHs');
    }

    console.log(bankAccount);

    const { bank } = bankAccount;

    // Validación de moneda BOB
    if (dto.currency === 'BOB') {
      if (bank.country !== 'Bolivia') {
        throw new BadRequestException(
          `La cuenta bancaria es de tipo ${bank.country} y no admite retiros en ${dto.currency}`,
        );
      }
    }

    if (dto.currency === 'PEN') {
      if (bank.country !== 'PERU') {
        throw new BadRequestException(
          `La cuenta bancaria es de tipo ${bank.country} y no admite retiros en ${dto.currency}`,
        );
      }
    }

    const totalAmount = dto.amount + servicefee;

    const FiatSent = parseInt(totalAmount) - parseInt(servicefee);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        //  Crear Fiat Operation
        const fiatOperation = await tx.fiatOperation.create({
          data: {
            type: 'WITHDRAW',
            userId,
            currency: dto.currency,
            amount: dto.amount,
            feeRate: dto.feeRate,
            serviceFee: dto.serviceFee,
            totalAmount: totalAmount,
            rateUsed: dto.rateUsed,
            rateSource: dto.rateSource,
            rateQuotedAt: dto.rateQuotedAt,
            rateExpiresAt: dto.rateExpiresAt,
            referenceCode,
            status: 'PENDING',
          },
        });

        // Crear Withdrawal Detail
        const withdrawalDetail = await tx.withdrawalDetail.create({
          data: {
            operationId: fiatOperation.id,
            burnedBOBH: totalAmount,
            fiatSent: FiatSent,
            bankAccountId: dto.bankAccountId,
          },
        });

        return {
          fiatOperation,
          withdrawalDetail,
        };
      });

      return {
        success: true,
        fiatOperation: result.fiatOperation,
        withdrawalDetail: {
          ...result.withdrawalDetail,
          bankAccountId: result.withdrawalDetail.bankAccountId.toString(),
        },
      };
    } catch (error) {
      console.error('Error creando retiro completo:', error);
      throw error;
    }
  }
}
