import { Injectable } from '@nestjs/common';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { PrismaService } from 'src/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

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
