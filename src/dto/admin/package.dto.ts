import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class DeliverableDto {
    @IsString()
    item: string;

    @IsNotEmpty()
    @Type(() => String)
    qty: string;
}

export class CreatePackageDto {
    @IsString()
    name: string;

    @IsNumber()
    @Type(() => Number)
    price: number;

    @IsString()
    duration: string;

    @IsMongoId()
    categoryId: string;

    @IsMongoId()
    subCategoryId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DeliverableDto)
    deliverables: DeliverableDto[];

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}

export class UpdatePackageDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    price?: number;

    @IsString()
    @IsOptional()
    duration?: string;

    @IsMongoId()
    @IsOptional()
    categoryId?: string;

    @IsMongoId()
    @IsOptional()
    subCategoryId?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeliverableDto)
    deliverables?: DeliverableDto[];

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}
