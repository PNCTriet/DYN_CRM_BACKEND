import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '../../domain/notification-category';

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

  @ApiPropertyOptional({
    enum: NOTIFICATION_CATEGORIES,
    description:
      'Sidebar bucket: orders, expenses, payments, vat, licenses, users, emails',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategory;
}

export class MarkAllNotificationsQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategory;
}

export class NotificationResponseDto {
  id!: string;
  recipientUserId!: string;
  type!: string;
  category!: string;
  title!: string;
  body!: string | null;
  readAt!: Date | null;
  sourceType!: string | null;
  sourceId!: string | null;
  href!: string | null;
  dedupeKey!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    recipientUserId: string;
    type: string;
    category?: string;
    title: string;
    body: string | null;
    readAt: Date | null;
    sourceType: string | null;
    sourceId: string | null;
    href?: string | null;
    dedupeKey?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = record.id;
    dto.recipientUserId = record.recipientUserId;
    dto.type = record.type;
    dto.category = record.category ?? 'orders';
    dto.title = record.title;
    dto.body = record.body;
    dto.readAt = record.readAt;
    dto.sourceType = record.sourceType;
    dto.sourceId = record.sourceId;
    dto.href = record.href ?? null;
    dto.dedupeKey = record.dedupeKey ?? null;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
