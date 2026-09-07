import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignOrderDto {
  @ApiProperty()
  @IsUUID()
  assignedUserId!: string;
}

export class ChangeOrderStageDto {
  @ApiProperty({ example: 'in_progress' })
  @IsString()
  @MaxLength(50)
  stage!: string;
}

export class ApproveOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
