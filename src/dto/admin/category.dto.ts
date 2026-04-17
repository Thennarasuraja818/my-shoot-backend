import { IsOptional, IsNotEmpty, IsString, IsBoolean, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateCategoryDto {
    @IsString()
    name?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsString()
    @IsOptional()
    description?: string;

    // @IsOptional()
    image?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsNumber()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    displayOrder?: number;
}
export class UpdateCategoryDto {
    @IsString()
    name?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    image?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsNumber()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    displayOrder?: number;
}
