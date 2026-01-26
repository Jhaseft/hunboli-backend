import { Module } from '@nestjs/common';
import { RetiroService } from './retiro.service';
import { RetiroController } from './retiro.controller';

@Module({
  controllers: [RetiroController],
  providers: [RetiroService],
})
export class RetiroModule {}
