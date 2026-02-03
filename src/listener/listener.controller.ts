import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ListenerService } from './listener.service';
import { CreateListenerDto } from './dto/create-listener.dto';
import { UpdateListenerDto } from './dto/update-listener.dto';

@Controller('listener')
export class ListenerController {
  constructor(private readonly listenerService: ListenerService) {}

  @Post()
  create(@Body() createListenerDto: CreateListenerDto) {
    return this.listenerService.create(createListenerDto);
  }

  @Get()
  findAll() {
    return this.listenerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listenerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateListenerDto: UpdateListenerDto) {
    return this.listenerService.update(+id, updateListenerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listenerService.remove(+id);
  }
}
