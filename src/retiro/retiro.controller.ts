import { Controller, UseGuards, Post, Body, Req } from '@nestjs/common';
import { RetiroService } from './retiro.service';
import { CreateFiatOperationDto } from './dto/fiat-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('retiro')
export class RetiroController {
  constructor(private retiroService: RetiroService) { }


  @Post()
  create(@Body() dto: CreateFiatOperationDto, @Req() req: any) {
    return this.retiroService.create(dto, String(req.user.id));
  }
}
