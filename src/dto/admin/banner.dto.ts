import { IsString, IsNotEmpty, IsObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class BannerImageDto {
    @IsString()
    @IsOptional()
    fileName?: string;

    @IsString()
    @IsNotEmpty()
    path: string;

    @IsString()
    @IsOptional()
    originalName?: string;
}

export class CreateBannerDto {
    @IsString()
    @IsNotEmpty({ message: "Title is required" })
    title: string;

    @IsObject()
    @IsNotEmpty({ message: "Image is required" })
    @ValidateNested()
    @Type(() => BannerImageDto)
    image: BannerImageDto;

    @IsOptional()
    status?: boolean;
}

export class UpdateBannerDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => BannerImageDto)
    image?: BannerImageDto;

    @IsOptional()
    status?: boolean;
}
