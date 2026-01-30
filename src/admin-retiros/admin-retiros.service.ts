import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateAdminRetiroDto } from './dto/update-admin-retiro.dto';
import { FiatOperationStatus as PrismaStatus } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

interface JwtUser {
  userId: string;
  email: string;
  isVerified: boolean;
}

@Injectable()
export class AdminRetirosService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }


  async getAllburns(page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.prisma.$transaction([
        this.prisma.withdrawalDetail.findMany({
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            operation: {
              include: {
                user: true,
              },
            },
            bankAccount: {
              include: {
                bank: true,
              },
            },
          },
        }),
        this.prisma.withdrawalDetail.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async searchBurns(query?: string, userId?: string) {
  const where: any = {};

  // Creamos un objeto para filtros dentro de operation
  const operationFilter: any = {};
  if (userId) {
    operationFilter.userId = userId;
  }
  if (query) {
    operationFilter.referenceCode = { contains: query, mode: 'insensitive' };
  }

  // Creamos un objeto para filtros dentro de bankAccount
  const bankFilter: any = {};
  if (query) {
    bankFilter.accountNumber = { contains: query, mode: 'insensitive' };
  }

  // Combinamos los filtros
  if (Object.keys(operationFilter).length > 0 || Object.keys(bankFilter).length > 0) {
    where.AND = [];

    if (Object.keys(operationFilter).length > 0) {
      where.AND.push({ operation: operationFilter });
    }

    if (Object.keys(bankFilter).length > 0) {
      where.AND.push({ bankAccount: bankFilter });
    }
  }

  const results = await this.prisma.withdrawalDetail.findMany({
    where,
    include: {
      operation: true,
      bankAccount: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return results;
}

  async update(
    id: string,
    dto: UpdateAdminRetiroDto,
    user: JwtUser,
    file?: Express.Multer.File,
  ) {
    // Buscar el withdrawal
    const withdrawal = await this.prisma.withdrawalDetail.findUnique({
      where: { id },
      select: { id: true, operationId: true },
    });

    if (!withdrawal) {
      throw new NotFoundException(`WithdrawalDetail with id ${id} not found`);
    }


    const fiatUpdateData: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    if (dto.status === PrismaStatus.PROCESSED) {
      fiatUpdateData.processedAt = new Date();
      fiatUpdateData.validatedAt = new Date();
      fiatUpdateData.validatedBy = { connect: { id: user.userId } }; // ⚡ Prisma requiere "connect"
    }

    const operation = await this.prisma.fiatOperation.update({
      where: { id: withdrawal.operationId },
      data: fiatUpdateData,
    });


    const withdrawalUpdateData: any = {};

    if (dto.payoutTxRef) {
      withdrawalUpdateData.payoutTxRef = dto.payoutTxRef;
      withdrawalUpdateData.paidAt = new Date();
    }

    if (file) {
      const uploadResult = await this.cloudinary.uploadWithdrawalProof({
        file,
        userId: user.userId,
        withdrawalId: id,
      });

      withdrawalUpdateData.logProofUrl = uploadResult.secureUrl;
      withdrawalUpdateData.cloudinaryPublicId = uploadResult.publicId;
      withdrawalUpdateData.proofUploadedAt = new Date();
    }

    // Solo actualizamos si hay algo
    if (Object.keys(withdrawalUpdateData).length > 0) {
      await this.prisma.withdrawalDetail.update({
        where: { id },
        data: withdrawalUpdateData,
      });
    }

    return operation;
  }



}
