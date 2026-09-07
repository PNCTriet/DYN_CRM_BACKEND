import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({ data });
  }

  findById(id: string) {
    return this.prisma.contact.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    customerId?: string;
    leadId?: string;
    search?: string;
  }) {
    const where: Prisma.ContactWhereInput = {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.leadId ? { leadId: params.leadId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ContactUpdateInput) {
    return this.prisma.contact.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }
}
