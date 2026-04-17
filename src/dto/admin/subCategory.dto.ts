import { IsOptional, IsNotEmpty, IsMongoId, IsString, IsBoolean, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateSubCategoryDto {
    @IsMongoId()
    categoryId?: string;

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
export class UpdateSubCategoryDto {
    @IsMongoId()
    categoryId?: string;

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
