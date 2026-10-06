import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
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

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Customer to attach to this order. Omit to keep. Must exist and be visible to the caller (customer.view + data scope). Changing it also sets the linked contract customerId in the same transaction. 409 CONTRACT_CUSTOMER_CONFLICT when that contract has other orders for a different customer. null is rejected.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Service to attach to this order. Omit to keep. Must exist and be visible (service.view + data scope). Does not change value or deadline. null is rejected.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'ACTIVE user recorded as the order submitter. Omit to keep. A real change requires order.update at ALL scope (OrderPolicy: currently permission order.assign). Otherwise 400 code SUBMITTER_IMMUTABLE. null is rejected.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  submitterUserId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Reassign the order. Omit to keep. Sending the current assignee is a no-op. Changing it requires order.assign (403 if missing). POST /orders/:id/assign stays available. null is rejected.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-10-20',
    description:
      'Processing deadline as a date-only YYYY-MM-DD civil day in Asia/Ho_Chi_Minh (stored as PostgreSQL DATE). Omit to keep. null clears. The order_overdue cron compares this date.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'deadline must be a date-only string YYYY-MM-DD',
  })
  deadline?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://zalo.me/g/example',
    description:
      'Zalo group URL (http or https, max 500). Omit to keep. null clears. Stored in zaloGroupLink and returned as both zaloGroupUrl and zaloGroupLink.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: true,
    },
    { message: 'zaloGroupUrl must be a valid http(s) URL' },
  )
  @MaxLength(500)
  zaloGroupUrl?: string | null;
}
