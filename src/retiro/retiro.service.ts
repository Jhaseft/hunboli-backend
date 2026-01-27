import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateFiatOperationDto } from './dto/fiat-operation.dto';
import { FiatOperationType, FiatOperationStatus } from '@prisma/client';

@Injectable()
export class RetiroService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateFiatOperationDto, userId: string) {
    try {
      const retiro = await this.prisma.fiatOperation.create({
        data: {
          type: "WITHDRAW", // prueba como string
          userId,
          currency: dto.currency,
          amount: dto.amount,
          feeRate: dto.feeRate,
          serviceFee: dto.serviceFee,
          totalAmount: dto.totalAmount,
          rateUsed: dto.rateUsed,
          rateSource: dto.rateSource,
          rateQuotedAt: dto.rateQuotedAt,
          rateExpiresAt: dto.rateExpiresAt,
          referenceCode: dto.referenceCode,
          status: "PENDING",
        },
      });

      return { success: true, operation: retiro };
    } catch (error) {
      console.log("Error creando retiro:", error);
      throw error; // para que veas el detalle en Postman / Thunder Client
    }
  }
}
