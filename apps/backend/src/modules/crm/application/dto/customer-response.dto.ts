export class CustomerResponseDto {
  id!: string;
  type!: string;
  ownerId!: string;
  industryOrField!: string | null;
  legalName!: string;
  displayName!: string;
  phone!: string | null;
  email!: string | null;
  taxId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    type: string;
    ownerId: string;
    industryOrField: string | null;
    legalName: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerResponseDto {
    const dto = new CustomerResponseDto();
    dto.id = record.id;
    dto.type = record.type;
    dto.ownerId = record.ownerId;
    dto.industryOrField = record.industryOrField;
    dto.legalName = record.legalName;
    dto.displayName = record.displayName;
    dto.phone = record.phone;
    dto.email = record.email;
    dto.taxId = record.taxId;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
