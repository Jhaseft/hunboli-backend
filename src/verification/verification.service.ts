import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { PrismaService } from 'src/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import request from 'supertest';
@Injectable()
export class VerificationService {

  constructor(private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService
  ) { }


  async createRequest(userId: string, file: Express.Multer.File) {
    const uploadResult = await this.cloudinary.uploadVerificationFile({ file, userId });
    return await this.prisma.verification_requests.create({
      data: {
        userId,
        imageUrl: uploadResult.secureUrl,
        cloudinaryPublicId: uploadResult.publicId,
        status: 'PENDING'
      }
    });
  }

  async findPendingRequests() {
    return this.prisma.verification_requests.findMany({
      where: { status: 'PENDING' },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
  }

  async acceptPendingRequest(requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.verification_requests.findUnique({ where: { id: requestId } });

      if (!request) throw new NotFoundException("Solicitud no encontrada");
      if (request.status !== 'PENDING') {
        throw new BadRequestException("La solicitud ya fue procesada");
      }

      await tx.user.update({
        where: { id: request.userId },
        data: { isVerified: true }
      });

      return tx.verification_requests.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });
    });
  }

  async rejectPendingRequest(requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.verification_requests.findUnique({ where: { id: requestId } });

      if (!request) throw new NotFoundException("Solicitud no encontrada");
      if (request.status !== 'PENDING') {
        throw new BadRequestException("La solicitud ya fue procesada");
      }

      await tx.user.update({
        where: { id: request.userId },
        data: { isVerified: false }
      });

      return tx.verification_requests.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      });
    });
  }




  create(createVerificationDto: CreateVerificationDto) {
    return 'This action adds a new verification';
  }

  findAll() {
    return `This action returns all verification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} verification`;
  }

  update(id: number, updateVerificationDto: UpdateVerificationDto) {
    return `This action updates a #${id} verification`;
  }

  remove(id: number) {
    return `This action removes a #${id} verification`;
  }
}
