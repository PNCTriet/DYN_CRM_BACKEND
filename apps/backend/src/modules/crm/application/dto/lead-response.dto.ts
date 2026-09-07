export class LeadResponseDto {
  id!: string;
  source!: string;
  status!: string;
  ownerId!: string | null;
  convertedCustomerId!: string | null;
  name!: string | null;
  phone!: string | null;
  email!: string | null;
  taxId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    source: string;
    status: string;
    ownerId: string | null;
    convertedCustomerId: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LeadResponseDto {
    const dto = new LeadResponseDto();
    Object.assign(dto, {
      id: record.id,
      source: record.source,
      status: record.status,
      ownerId: record.ownerId,
      convertedCustomerId: record.convertedCustomerId,
      name: record.name,
      phone: record.phone,
      email: record.email,
      taxId: record.taxId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    return dto;
  }
}
