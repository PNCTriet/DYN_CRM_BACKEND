import { ContractStatus } from '@prisma/client';

export class ContractResponseDto {
  id!: string;
  contractNumber!: string;
  customerId!: string;
  status!: ContractStatus;
  title!: string | null;
  description!: string | null;
  signedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    contractNumber: string;
    customerId: string;
    status: ContractStatus;
    title: string | null;
    description: string | null;
    signedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContractResponseDto {
    const dto = new ContractResponseDto();
    dto.id = record.id;
    dto.contractNumber = record.contractNumber;
    dto.customerId = record.customerId;
    dto.status = record.status;
    dto.title = record.title;
    dto.description = record.description;
    dto.signedAt = record.signedAt;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
