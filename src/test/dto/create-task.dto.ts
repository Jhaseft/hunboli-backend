import { IsString } from "class-validator";

export class CreatetaskDto {
    @IsString()
    name: string;

    @IsString()
    email: string;

    @IsString()
    password: string;

}