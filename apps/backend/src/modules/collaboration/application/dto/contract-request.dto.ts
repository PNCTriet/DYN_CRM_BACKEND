import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContractRequestDto {
  @ApiProperty()
  @IsUUID()
  collaboratorId!: string;

  @ApiProperty({ example: 'Yêu cầu hợp đồng dịch vụ' })
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
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;
}

export class UpdateContractRequestDto {
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
  @IsUUID()
  customerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string | null;
}

export class ListContractRequestsQueryDto {
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

  @ApiPropertyOptional({ enum: ContractRequestStatus })
  @IsOptional()
  @IsEnum(ContractRequestStatus)
  status?: ContractRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;
}

export class ReviewContractRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ApproveContractRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approvedContractId?: string;
}

export class ContractRequestResponseDto {
  id!: string;
  collaboratorId!: string;
  customerId!: string | null;
  leadId!: string | null;
  title!: string;
  description!: string | null;
  status!: ContractRequestStatus;
  reviewedByUserId!: string | null;
  reviewedAt!: Date | null;
  reviewNote!: string | null;
  approvedContractId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    collaboratorId: string;
    customerId: string | null;
    leadId: string | null;
    title: string;
    description: string | null;
    status: ContractRequestStatus;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    approvedContractId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContractRequestResponseDto {
    const dto = new ContractRequestResponseDto();
    dto.id = record.id;
    dto.collaboratorId = record.collaboratorId;
    dto.customerId = record.customerId;
    dto.leadId = record.leadId;
    dto.title = record.title;
    dto.description = record.description;
    dto.status = record.status;
    dto.reviewedByUserId = record.reviewedByUserId;
    dto.reviewedAt = record.reviewedAt;
    dto.reviewNote = record.reviewNote;
    dto.approvedContractId = record.approvedContractId;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
