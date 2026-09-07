import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({ data });
  }

  findById(id: string) {
    return this.prisma.lead.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    ownerId?: string;
    status?: string;
    search?: string;
  }) {
    const where: Prisma.LeadWhereInput = {
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
              { taxId: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.LeadUpdateInput) {
    return this.prisma.lead.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.lead.delete({ where: { id } });
  }

  /** Convert lead → customer in one transaction; re-link contacts. */
  convert(params: {
    leadId: string;
    customer: Prisma.CustomerCreateInput;
    status: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: params.customer });
      const lead = await tx.lead.update({
        where: { id: params.leadId },
        data: {
          status: params.status,
          convertedCustomer: { connect: { id: customer.id } },
        },
      });
      await tx.contact.updateMany({
        where: { leadId: params.leadId },
        data: { customerId: customer.id },
      });
      return { lead, customer };
    });
  }
}
