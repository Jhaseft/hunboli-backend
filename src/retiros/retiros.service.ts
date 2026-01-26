import { Injectable } from '@nestjs/common';
import { CreateRetiroDto } from './dto/create-retiro.dto';
import { UpdateRetiroDto } from './dto/update-retiro.dto';
import { PrismaService } from '../prisma.service';
@Injectable()
export class RetirosService {
  constructor(private prisma: PrismaService) {}

  create(createRetiroDto: CreateRetiroDto) {
    return 'This action adds a new retiro';
  }

  findAll() {
    return `This action returns all retiros`;
  }

  findOne(id: number) {
    return `This action returns a #${id} retiro`;
  }

  update(id: number, updateRetiroDto: UpdateRetiroDto) {
    return `This action updates a #${id} retiro`;
  }

  remove(id: number) {
    return `This action removes a #${id} retiro`;
  }
}
