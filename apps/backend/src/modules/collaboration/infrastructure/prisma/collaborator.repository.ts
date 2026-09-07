import { Injectable } from '@nestjs/common';
import { CollaboratorStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CollaboratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CollaboratorCreateInput) {
    return this.prisma.collaborator.create({ data });
  }

  findById(id: string) {
    return this.prisma.collaborator.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    search?: string;
    status?: CollaboratorStatus;
  }) {
    const where: Prisma.CollaboratorWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              {
                displayName: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.collaborator.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.collaborator.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CollaboratorUpdateInput) {
    return this.prisma.collaborator.update({ where: { id }, data });
  }

  findCustomer(customerId: string) {
    return this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
  }

  assignCustomer(collaboratorId: string, customerId: string) {
    return this.prisma.collaboratorCustomer.create({
      data: {
        collaboratorId,
        customerId,
        assignedAt: new Date(),
      },
    });
  }

  unassignCustomer(collaboratorId: string, customerId: string) {
    return this.prisma.collaboratorCustomer.delete({
      where: {
        collaboratorId_customerId: { collaboratorId, customerId },
      },
    });
  }

  listCustomers(collaboratorId: string) {
    return this.prisma.collaboratorCustomer.findMany({
      where: { collaboratorId },
      orderBy: { assignedAt: 'desc' },
    });
  }

  findUser(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
  }
}
