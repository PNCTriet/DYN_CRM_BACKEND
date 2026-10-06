import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class EmailTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.EmailTemplateCreateInput) {
    return this.prisma.emailTemplate.create({ data });
  }

  findMany(params: { skip: number; take: number; activeOnly?: boolean }) {
    const where: Prisma.EmailTemplateWhereInput = params.activeOnly
      ? { isActive: true }
      : {};
    return Promise.all([
      this.prisma.emailTemplate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { key: 'asc' },
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.emailTemplate.findFirst({ where: { id } });
  }

  findByKey(key: string) {
    return this.prisma.emailTemplate.findFirst({ where: { key } });
  }

  update(id: string, data: Prisma.EmailTemplateUpdateInput) {
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.emailTemplate.delete({ where: { id } });
  }
}
