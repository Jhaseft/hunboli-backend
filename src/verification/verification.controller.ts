import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { KycStatus, UserRole } from '@prisma/client';
interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
  kycStatus: KycStatus;
  isVerified: boolean;
}
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) { }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 7 * 1024 * 1024 }, // 7MB
    })
  )
  async uploadVerificationFile(@CurrentUser() user: JwtUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, WebP y PDF');
    }

    const userId = user.userId;
    return this.verificationService.createRequest(userId, file);
  }

  @Get('pending-requests')
  @UseGuards(JwtAuthGuard)
  async getPendingRequests(@CurrentUser() user: JwtUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acceso denegado');
    }
    return this.verificationService.findPendingRequests();
  }

  @Post()
  create(@Body() createVerificationDto: CreateVerificationDto) {
    return this.verificationService.create(createVerificationDto);
  }

  @Get()
  findAll() {
    return this.verificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVerificationDto: UpdateVerificationDto) {
    return this.verificationService.update(+id, updateVerificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.verificationService.remove(+id);
  }
}
