import { Module } from '@nestjs/common';
import { AdminRetirosService } from './admin-retiros.service';
import { AdminRetirosController } from './admin-retiros.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [AdminRetirosController],
  providers: [AdminRetirosService,CloudinaryService],
})
export class AdminRetirosModule {}
