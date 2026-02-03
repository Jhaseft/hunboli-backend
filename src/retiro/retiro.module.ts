import { Module } from '@nestjs/common';
import { RetiroService } from './retiro.service';
import { RetiroController } from './retiro.controller';
import { SafeService } from 'src/safe/safe.service';

@Module({
  controllers: [RetiroController],
  providers: [RetiroService],
})
export class RetiroModule {}
