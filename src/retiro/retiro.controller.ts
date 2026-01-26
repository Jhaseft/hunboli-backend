import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RetiroService } from './retiro.service';
import { CreateRetiroDto } from './dto/create-retiro.dto';
import { UpdateRetiroDto } from './dto/update-retiro.dto';

@Controller('retiro')
export class RetiroController {
  constructor(private readonly retiroService: RetiroService) {}

  @Post()
  create(@Body() createRetiroDto: CreateRetiroDto) {
    return this.retiroService.create(createRetiroDto);
  }

  @Get()
  findAll() {
    return this.retiroService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.retiroService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRetiroDto: UpdateRetiroDto) {
    return this.retiroService.update(+id, updateRetiroDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.retiroService.remove(+id);
  }
}
