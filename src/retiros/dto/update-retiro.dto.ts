import { PartialType } from '@nestjs/swagger';
import { CreateRetiroDto } from './create-retiro.dto';

export class UpdateRetiroDto extends PartialType(CreateRetiroDto) {}
