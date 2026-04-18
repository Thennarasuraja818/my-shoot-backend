import { IsOptional, IsNotEmpty, IsString, IsBoolean, IsNumber, Min, IsEnum, IsArray, IsDateString } from "class-validator";
import { Type } from "class-transformer";

export class CreateCouponDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsEnum(['percentage', 'fixed'])
    @IsNotEmpty()
    type: 'percentage' | 'fixed';

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    value: number;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    global_usage_limit: number;

    @IsDateString()
    @IsNotEmpty()
    expires_at: string;

    @IsEnum(['all', 'specific'])
    @IsNotEmpty()
    scope: 'all' | 'specific';

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    package_ids?: string[];

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    min_amount?: number;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class UpdateCouponDto {
    @IsString()
    @IsOptional()
    code?: string;

    @IsEnum(['percentage', 'fixed'])
    @IsOptional()
    type?: 'percentage' | 'fixed';

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    value?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    global_usage_limit?: number;

    @IsDateString()
    @IsOptional()
    expires_at?: string;

    @IsEnum(['all', 'specific'])
    @IsOptional()
    scope?: 'all' | 'specific';

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    package_ids?: string[];

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    min_amount?: number;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
