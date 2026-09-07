import { Decimal } from '@prisma/client/runtime/library';

export class ServiceResponseDto {
  id!: string;
  code!: string | null;
  name!: string;
  description!: string | null;
  category!: string | null;
  unitPrice!: string | null;
  processingDays!: number | null;
  status!: string;
  customFields!: unknown;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    code: string | null;
    name: string;
    description: string | null;
    category: string | null;
    unitPrice: Decimal | null;
    processingDays: number | null;
    status: string;
    customFields: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ServiceResponseDto {
    const dto = new ServiceResponseDto();
    dto.id = record.id;
    dto.code = record.code;
    dto.name = record.name;
    dto.description = record.description;
    dto.category = record.category;
    dto.unitPrice =
      record.unitPrice === null || record.unitPrice === undefined
        ? null
        : record.unitPrice.toString();
    dto.processingDays = record.processingDays;
    dto.status = record.status;
    dto.customFields = record.customFields;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
