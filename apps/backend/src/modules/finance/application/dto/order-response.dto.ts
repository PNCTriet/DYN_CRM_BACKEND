import { Decimal } from '@prisma/client/runtime/library';

function dec(v: Decimal | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

export class OrderResponseDto {
  id!: string;
  orderNumber!: string;
  contractId!: string;
  customerId!: string;
  serviceId!: string;
  stage!: string;
  channel!: string;
  collaboratorId!: string | null;
  value!: string;
  collaboratorPrice!: string | null;
  totalNet!: string;
  vatRate!: string;
  totalGross!: string;
  currency!: string;
  assignedUserId!: string;
  submitterUserId!: string;
  reviewerUserId!: string | null;
  approvalStatus!: string;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    orderNumber: string;
    contractId: string;
    customerId: string;
    serviceId: string;
    stage: string;
    channel: string;
    collaboratorId: string | null;
    value: Decimal;
    collaboratorPrice: Decimal | null;
    totalNet: Decimal;
    vatRate: Decimal;
    totalGross: Decimal;
    currency: string;
    assignedUserId: string;
    submitterUserId: string;
    reviewerUserId: string | null;
    approvalStatus: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = record.id;
    dto.orderNumber = record.orderNumber;
    dto.contractId = record.contractId;
    dto.customerId = record.customerId;
    dto.serviceId = record.serviceId;
    dto.stage = record.stage;
    dto.channel = record.channel;
    dto.collaboratorId = record.collaboratorId;
    dto.value = record.value.toString();
    dto.collaboratorPrice = dec(record.collaboratorPrice);
    dto.totalNet = record.totalNet.toString();
    dto.vatRate = record.vatRate.toString();
    dto.totalGross = record.totalGross.toString();
    dto.currency = record.currency;
    dto.assignedUserId = record.assignedUserId;
    dto.submitterUserId = record.submitterUserId;
    dto.reviewerUserId = record.reviewerUserId;
    dto.approvalStatus = record.approvalStatus;
    dto.notes = record.notes;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
