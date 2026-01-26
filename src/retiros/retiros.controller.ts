import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RetirosService } from './retiros.service';
import { CreateRetiroDto } from './dto/create-retiro.dto';
import { UpdateRetiroDto } from './dto/update-retiro.dto';

@Controller('retiros')
export class RetirosController {
  constructor(private readonly retirosService: RetirosService) {}

  @Post()
  create(@Body() createRetiroDto: CreateRetiroDto) {
    return this.retirosService.create(createRetiroDto);
  }

  @Get()
  findAll() {
    return this.retirosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.retirosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRetiroDto: UpdateRetiroDto) {
    return this.retirosService.update(+id, updateRetiroDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.retirosService.remove(+id);
  }
}
