import { Body, Controller, Patch, Param, Req } from '@nestjs/common';
import { RequestCorrectionDto } from './dto/request-correction.dto';

@Controller('admin/fiat-operations')
export class AdminFiatOperationsController {
    constructor(private readonly service: AdminFiatOperationsService) {}

    @Patch(':id/request-correction')
    async requestCorrection(@Param('id') id: string, @Body() body: RequestCorrectionDto, @Req() req) {
        conts adminId = req.user.id;
        return this.service.requestDepositCorrection(adminId, id, body.note);
    }
}
