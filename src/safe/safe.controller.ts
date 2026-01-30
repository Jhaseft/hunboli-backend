import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SafeService } from './safe.service';
import { CreateSafeDto } from './dto/create-safe.dto';
import { UpdateSafeDto } from './dto/update-safe.dto';

@Controller('safe')
export class SafeController {
  constructor(private readonly safeService: SafeService) {}

  @Post()
  create(@Body() createSafeDto: CreateSafeDto) {
    return this.safeService.create(createSafeDto);
  }

  @Get()
  findAll() {
    return this.safeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.safeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSafeDto: UpdateSafeDto) {
    return this.safeService.update(+id, updateSafeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.safeService.remove(+id);
  }
}
