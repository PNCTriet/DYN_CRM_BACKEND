import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collaboratorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalNet?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalGross?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({
    description:
      'Staff commission percent for assignedUserId (0–100). Omit to keep. null clears.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channel?: string;

  @ApiPropertyOptional({
    description:
      'User allowed to approve/reject expenses on this order. null clears it.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  reviewerUserId?: string | null;
}
