import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
import { formatDateOnly } from '../../domain/date-only';

function dec(v: Decimal | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

export type OrderDisplayNames = {
  customerName?: string | null;
  serviceName?: string | null;
  assignedUserName?: string | null;
  submitterName?: string | null;
  reviewerName?: string | null;
  collaboratorName?: string | null;
};

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  contractId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty({ nullable: true })
  collaboratorId!: string | null;

  @ApiProperty({ description: 'Decimal string' })
  value!: string;

  @ApiProperty({ nullable: true })
  collaboratorPrice!: string | null;

  @ApiProperty({ nullable: true })
  commissionPercent!: string | null;

  @ApiProperty()
  totalNet!: string;

  @ApiProperty()
  vatRate!: string;

  @ApiProperty()
  totalGross!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  assignedUserId!: string;

  @ApiProperty()
  submitterUserId!: string;

  @ApiProperty({ nullable: true })
  reviewerUserId!: string | null;

  @ApiProperty()
  approvalStatus!: string;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({
    nullable: true,
    example: '2026-10-20',
    description:
      'Date-only YYYY-MM-DD (Asia/Ho_Chi_Minh civil day) or null.',
  })
  deadline!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Stored Zalo group URL. Same value as zaloGroupUrl.',
  })
  zaloGroupLink!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'FE alias of zaloGroupLink.',
  })
  zaloGroupUrl!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  customerName!: string | null;

  @ApiProperty({ nullable: true })
  serviceName!: string | null;

  @ApiProperty({ nullable: true })
  assignedUserName!: string | null;

  @ApiProperty({ nullable: true })
  submitterName!: string | null;

  @ApiProperty({ nullable: true })
  reviewerName!: string | null;

  @ApiProperty({ nullable: true })
  collaboratorName!: string | null;

  static from(
    record: {
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
      commissionPercent: Decimal | null;
      totalNet: Decimal;
      vatRate: Decimal;
      totalGross: Decimal;
      currency: string;
      assignedUserId: string;
      submitterUserId: string;
      reviewerUserId: string | null;
      approvalStatus: string;
      notes: string | null;
      deadline?: Date | null;
      zaloGroupLink?: string | null;
      createdAt: Date;
      updatedAt: Date;
      service?: { name: string } | null;
      collaborator?: { displayName: string } | null;
    },
    names: OrderDisplayNames = {},
  ): OrderResponseDto {
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
    dto.commissionPercent = dec(record.commissionPercent);
    dto.totalNet = record.totalNet.toString();
    dto.vatRate = record.vatRate.toString();
    dto.totalGross = record.totalGross.toString();
    dto.currency = record.currency;
    dto.assignedUserId = record.assignedUserId;
    dto.submitterUserId = record.submitterUserId;
    dto.reviewerUserId = record.reviewerUserId;
    dto.approvalStatus = record.approvalStatus;
    dto.notes = record.notes;
    dto.deadline = formatDateOnly(record.deadline);
    dto.zaloGroupLink = record.zaloGroupLink ?? null;
    dto.zaloGroupUrl = record.zaloGroupLink ?? null;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    dto.customerName = names.customerName ?? null;
    dto.serviceName = names.serviceName ?? record.service?.name ?? null;
    dto.assignedUserName = names.assignedUserName ?? null;
    dto.submitterName = names.submitterName ?? null;
    dto.reviewerName = names.reviewerName ?? null;
    dto.collaboratorName =
      names.collaboratorName ?? record.collaborator?.displayName ?? null;
    return dto;
  }
}
