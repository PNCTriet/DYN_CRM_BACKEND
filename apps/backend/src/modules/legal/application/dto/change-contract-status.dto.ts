import { ApiProperty } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeContractStatusDto {
  @ApiProperty({ enum: ContractStatus })
  @IsEnum(ContractStatus)
  status!: ContractStatus;
}
