import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReminderDto {
  @ApiPropertyOptional({
    description: 'Defaults to current user',
  })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiProperty({ example: 'Follow up contract' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' })
  @IsDateString()
  remindAt!: string;
}

export class UpdateReminderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  remindAt?: string;
}

export class ListRemindersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ReminderResponseDto {
  id!: string;
  recipientUserId!: string;
  title!: string;
  description!: string | null;
  sourceType!: string | null;
  sourceId!: string | null;
  remindAt!: Date;
  status!: string;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    recipientUserId: string;
    title: string;
    description: string | null;
    sourceType: string | null;
    sourceId: string | null;
    remindAt: Date;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReminderResponseDto {
    const dto = new ReminderResponseDto();
    dto.id = record.id;
    dto.recipientUserId = record.recipientUserId;
    dto.title = record.title;
    dto.description = record.description;
    dto.sourceType = record.sourceType;
    dto.sourceId = record.sourceId;
    dto.remindAt = record.remindAt;
    dto.status = record.status;
    dto.completedAt = record.completedAt;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
