import { Module } from '@nestjs/common';
import { ListenerService } from './listener.service';
import { ListenerController } from './listener.controller';

@Module({
  controllers: [ListenerController],
  providers: [ListenerService],
})
export class ListenerModule {}
