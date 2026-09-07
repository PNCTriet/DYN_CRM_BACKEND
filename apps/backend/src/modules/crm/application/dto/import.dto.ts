import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateImportBatchDto {
  @ApiPropertyOptional({ example: 'uploads/leads-2026-09.csv' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileRef?: string;
}

export class ImportRowInputDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowNumber!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      name: 'Lead A',
      phone: '0901234567',
      email: 'a@example.com',
      source: 'import',
    },
  })
  @IsObject()
  rawJson!: Record<string, unknown>;
}

export class AddImportRowsDto {
  @ApiProperty({ type: [ImportRowInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportRowInputDto)
  rows!: ImportRowInputDto[];
}

export class ImportRowResponseDto {
  id!: string;
  batchId!: string;
  rowNumber!: number;
  rawJson!: unknown;
  validationStatus!: string;
  resultingLeadId!: string | null;

  static from(record: {
    id: string;
    batchId: string;
    rowNumber: number;
    rawJson: unknown;
    validationStatus: string;
    resultingLeadId: string | null;
  }): ImportRowResponseDto {
    const dto = new ImportRowResponseDto();
    dto.id = record.id;
    dto.batchId = record.batchId;
    dto.rowNumber = record.rowNumber;
    dto.rawJson = record.rawJson;
    dto.validationStatus = record.validationStatus;
    dto.resultingLeadId = record.resultingLeadId;
    return dto;
  }
}

export class ImportBatchResponseDto {
  id!: string;
  fileRef!: string | null;
  status!: string;
  createdByUserId!: string;
  committedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  rows?: ImportRowResponseDto[];

  static from(
    record: {
      id: string;
      fileRef: string | null;
      status: string;
      createdByUserId: string;
      committedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      rows?: {
        id: string;
        batchId: string;
        rowNumber: number;
        rawJson: unknown;
        validationStatus: string;
        resultingLeadId: string | null;
      }[];
    },
  ): ImportBatchResponseDto {
    const dto = new ImportBatchResponseDto();
    dto.id = record.id;
    dto.fileRef = record.fileRef;
    dto.status = record.status;
    dto.createdByUserId = record.createdByUserId;
    dto.committedAt = record.committedAt;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    if (record.rows) {
      dto.rows = record.rows.map((r) => ImportRowResponseDto.from(r));
    }
    return dto;
  }
}
