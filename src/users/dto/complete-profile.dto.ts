import { Country } from "./create-user.dto";

export class CompleteProfileDto {

    password: string;
    phoneNumber: string;
    country: Country;
}