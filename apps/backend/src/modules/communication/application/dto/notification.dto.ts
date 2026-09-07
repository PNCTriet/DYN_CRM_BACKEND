import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
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
}

export class NotificationResponseDto {
  id!: string;
  recipientUserId!: string;
  type!: string;
  title!: string;
  body!: string | null;
  readAt!: Date | null;
  sourceType!: string | null;
  sourceId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    recipientUserId: string;
    type: string;
    title: string;
    body: string | null;
    readAt: Date | null;
    sourceType: string | null;
    sourceId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = record.id;
    dto.recipientUserId = record.recipientUserId;
    dto.type = record.type;
    dto.title = record.title;
    dto.body = record.body;
    dto.readAt = record.readAt;
    dto.sourceType = record.sourceType;
    dto.sourceId = record.sourceId;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
