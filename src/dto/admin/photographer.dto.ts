import { IsOptional, IsNotEmpty, IsString, IsBoolean, IsArray, IsEmail } from "class-validator";

export class CreatePhotographerDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    profile_pic?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specializations?: string[];

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class UpdatePhotographerDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    profile_pic?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specializations?: string[];

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
