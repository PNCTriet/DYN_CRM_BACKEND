import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateWorkflowStageDto {
  @ApiProperty({ example: 'Thu thập hồ sơ' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({ example: 'LAWYER' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsibleRoleCode?: string;
}

export class CreateWorkflowTemplateDto {
  @ApiProperty({ example: 'Quy trình hợp đồng chuẩn' })
  @IsString()
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateWorkflowStageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStageDto)
  stages?: CreateWorkflowStageDto[];
}

export class UpdateWorkflowTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StartWorkflowInstanceDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsUUID()
  templateId!: string;
}

export class AdvanceWorkflowInstanceDto {
  @ApiProperty({ description: 'Target stage id within the same template' })
  @IsUUID()
  stageId!: string;
}
