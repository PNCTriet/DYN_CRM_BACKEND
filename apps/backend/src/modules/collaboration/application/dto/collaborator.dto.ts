import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollaboratorStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCollaboratorDto {
  @ApiProperty({ description: 'Linked user id' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'CTV Nguyen Van A' })
  @IsString()
  @MaxLength(500)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateCollaboratorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ enum: CollaboratorStatus })
  @IsOptional()
  @IsEnum(CollaboratorStatus)
  status?: CollaboratorStatus;
}

export class ListCollaboratorsQueryDto {
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
  search?: string;

  @ApiPropertyOptional({ enum: CollaboratorStatus })
  @IsOptional()
  @IsEnum(CollaboratorStatus)
  status?: CollaboratorStatus;
}

export class AssignCollaboratorCustomerDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;
}

export class CollaboratorResponseDto {
  id!: string;
  userId!: string;
  displayName!: string;
  phone!: string | null;
  email!: string | null;
  status!: CollaboratorStatus;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    userId: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    status: CollaboratorStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CollaboratorResponseDto {
    const dto = new CollaboratorResponseDto();
    dto.id = record.id;
    dto.userId = record.userId;
    dto.displayName = record.displayName;
    dto.phone = record.phone;
    dto.email = record.email;
    dto.status = record.status;
    dto.notes = record.notes;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}

export class CollaboratorCustomerResponseDto {
  collaboratorId!: string;
  customerId!: string;
  assignedAt!: Date;

  static from(record: {
    collaboratorId: string;
    customerId: string;
    assignedAt: Date;
  }): CollaboratorCustomerResponseDto {
    const dto = new CollaboratorCustomerResponseDto();
    dto.collaboratorId = record.collaboratorId;
    dto.customerId = record.customerId;
    dto.assignedAt = record.assignedAt;
    return dto;
  }
}
