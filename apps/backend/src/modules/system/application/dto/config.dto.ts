import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  valueJson!: Record<string, unknown> | unknown[];
}

export class ListConfigQueryDto {
  @ApiPropertyOptional({ description: 'Filter by exact key' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  key?: string;
}

export class ConfigResponseDto {
  key!: string;
  valueJson!: unknown;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    key: string;
    valueJson: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ConfigResponseDto {
    const dto = new ConfigResponseDto();
    dto.key = record.key;
    dto.valueJson = record.valueJson;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
