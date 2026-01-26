import { Module } from '@nestjs/common';
import { RetirosService } from './retiros.service';
import { RetirosController } from './retiros.controller';

@Module({
  controllers: [RetirosController],
  providers: [RetirosService],
})
export class RetirosModule {}
