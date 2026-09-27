import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const NOTIFICATION_CHANNELS = ['EMAIL', 'IN_APP', 'TELEGRAM'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export class UpsertNotificationPreferenceDto {
  @ApiProperty({ enum: NOTIFICATION_CHANNELS })
  @IsIn(NOTIFICATION_CHANNELS)
  channel!: NotificationChannel;

  @ApiProperty({
    example: 'expense.approved',
    description: 'Use "*" for all event types on this channel',
  })
  @IsString()
  @MaxLength(100)
  eventType!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description: 'Telegram chat id or alternate address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  channelAddress?: string | null;
}

export class NotificationPreferenceResponseDto {
  id!: string;
  userId!: string;
  channel!: string;
  eventType!: string;
  enabled!: boolean;
  channelAddress!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static from(record: {
    id: string;
    userId: string;
    channel: string;
    eventType: string;
    enabled: boolean;
    channelAddress: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationPreferenceResponseDto {
    const dto = new NotificationPreferenceResponseDto();
    dto.id = record.id;
    dto.userId = record.userId;
    dto.channel = record.channel;
    dto.eventType = record.eventType;
    dto.enabled = record.enabled;
    dto.channelAddress = record.channelAddress;
    dto.createdAt = record.createdAt.toISOString();
    dto.updatedAt = record.updatedAt.toISOString();
    return dto;
  }
}
