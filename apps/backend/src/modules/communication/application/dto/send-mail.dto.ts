import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendTemplatedMailDto {
  @ApiProperty({ example: 'expense.approved' })
  @IsString()
  @MaxLength(100)
  templateKey!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  to!: string;

  @ApiPropertyOptional({
    example: { name: 'An', title: 'Chi phí văn phòng' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'If set, EMAIL preference for this user/event is checked',
  })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({
    description: 'Defaults to templateKey for preference lookup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedNotificationId?: string;
}

export class SendTestMailDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  to!: string;
}

export class ListOutboundEmailsQueryDto {
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
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateKey?: string;
}

export class OutboundEmailLogResponseDto {
  id!: string;
  toAddress!: string;
  fromAddress!: string | null;
  templateKey!: string;
  subject!: string | null;
  providerMessageId!: string | null;
  status!: string;
  errorMessage!: string | null;
  relatedNotificationId!: string | null;
  createdAt!: string;

  static from(record: {
    id: string;
    toAddress: string;
    fromAddress: string | null;
    templateKey: string;
    subject: string | null;
    providerMessageId: string | null;
    status: string;
    errorMessage: string | null;
    relatedNotificationId: string | null;
    createdAt: Date;
  }): OutboundEmailLogResponseDto {
    const dto = new OutboundEmailLogResponseDto();
    dto.id = record.id;
    dto.toAddress = record.toAddress;
    dto.fromAddress = record.fromAddress;
    dto.templateKey = record.templateKey;
    dto.subject = record.subject;
    dto.providerMessageId = record.providerMessageId;
    dto.status = record.status;
    dto.errorMessage = record.errorMessage;
    dto.relatedNotificationId = record.relatedNotificationId;
    dto.createdAt = record.createdAt.toISOString();
    return dto;
  }
}
