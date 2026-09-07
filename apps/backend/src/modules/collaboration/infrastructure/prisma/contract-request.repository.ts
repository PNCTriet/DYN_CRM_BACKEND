import { Injectable } from '@nestjs/common';
import { ContractRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ContractRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContractRequestCreateInput) {
    return this.prisma.contractRequest.create({
      data,
      include: { collaborator: { select: { userId: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.contractRequest.findFirst({
      where: { id },
      include: { collaborator: { select: { userId: true } } },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    status?: ContractRequestStatus;
    collaboratorId?: string;
  }) {
    const where: Prisma.ContractRequestWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.collaboratorId
        ? { collaboratorId: params.collaboratorId }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.contractRequest.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { collaborator: { select: { userId: true } } },
      }),
      this.prisma.contractRequest.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ContractRequestUpdateInput) {
    return this.prisma.contractRequest.update({
      where: { id },
      data,
      include: { collaborator: { select: { userId: true } } },
    });
  }

  findCollaborator(id: string) {
    return this.prisma.collaborator.findFirst({
      where: { id },
      select: { id: true, userId: true },
    });
  }

  findContract(id: string) {
    return this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
  }
}
