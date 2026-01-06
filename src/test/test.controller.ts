import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestService } from './test.service';
import { CreatetaskDto } from './dto/create-task.dto';

@Controller()
export class TestController {
    constructor(
        private testService: TestService,
        private configService: ConfigService
    ) { }

    @Get('/test')
    async getTest() {
        return await this.testService.getTestService();
    }

    @Post('/test')
    async createTest(@Body() test: CreatetaskDto) {
        return await this.testService.createTestServices(test);
    }
}