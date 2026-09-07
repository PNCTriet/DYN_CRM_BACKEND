import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DocumentMetadataCreateInput) {
    return this.prisma.documentMetadata.create({ data });
  }

  findById(id: string) {
    return this.prisma.documentMetadata.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    contractId?: string;
    orderId?: string;
  }) {
    const where: Prisma.DocumentMetadataWhereInput = {
      deletedAt: null,
      ...(params.contractId ? { contractId: params.contractId } : {}),
      ...(params.orderId ? { orderId: params.orderId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.documentMetadata.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentMetadata.count({ where }),
    ]);
  }

  softDelete(id: string) {
    return this.prisma.documentMetadata.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

/** Serialize BigInt fileSize for JSON responses. */
export function mapDocument(row: {
  id: string;
  contractId: string | null;
  orderId: string | null;
  storageKey: string;
  fileName: string;
  fileType: string | null;
  mimeType: string | null;
  fileSize: bigint | null;
  uploadedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    contractId: row.contractId,
    orderId: row.orderId,
    storageKey: row.storageKey,
    fileName: row.fileName,
    fileType: row.fileType,
    mimeType: row.mimeType,
    fileSize: row.fileSize === null ? null : Number(row.fileSize),
    uploadedByUserId: row.uploadedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
