import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'expense.approved' })
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'Expense approved' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Chi phí {{title}} đã được duyệt' })
  @IsString()
  @MaxLength(500)
  subject!: string;

  @ApiProperty({ example: '<p>Xin chào {{name}},</p><p>...</p>' })
  @IsString()
  htmlBody!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textBody?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListEmailTemplatesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Only active templates' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class EmailTemplateResponseDto {
  id!: string;
  key!: string;
  name!: string;
  subject!: string;
  htmlBody!: string;
  textBody!: string | null;
  description!: string | null;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static from(record: {
    id: string;
    key: string;
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): EmailTemplateResponseDto {
    const dto = new EmailTemplateResponseDto();
    dto.id = record.id;
    dto.key = record.key;
    dto.name = record.name;
    dto.subject = record.subject;
    dto.htmlBody = record.htmlBody;
    dto.textBody = record.textBody;
    dto.description = record.description;
    dto.isActive = record.isActive;
    dto.createdAt = record.createdAt.toISOString();
    dto.updatedAt = record.updatedAt.toISOString();
    return dto;
  }
}
