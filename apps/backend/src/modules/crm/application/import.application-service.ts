import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthUser } from '../../identity/domain/auth-user';
import {
  AddImportRowsDto,
  CreateImportBatchDto,
  ImportBatchResponseDto,
} from './dto/import.dto';

function validateLeadRow(raw: Record<string, unknown>): string {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (!name && !phone && !email) return 'INVALID';
  return 'VALID';
}

@Injectable()
export class ImportApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(
    user: AuthUser,
    dto: CreateImportBatchDto,
  ): Promise<ImportBatchResponseDto> {
    const batch = await this.prisma.importBatch.create({
      data: {
        fileRef: dto.fileRef,
        status: 'OPEN',
        createdByUserId: user.id,
      },
    });
    return ImportBatchResponseDto.from(batch);
  }

  async addRows(
    user: AuthUser,
    batchId: string,
    dto: AddImportRowsDto,
  ): Promise<ImportBatchResponseDto> {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundException('Import batch not found');
    if (batch.status !== 'OPEN') {
      throw new BadRequestException('Batch is not open for new rows');
    }
    await this.prisma.importRow.createMany({
      data: dto.rows.map((r) => ({
        batchId,
        rowNumber: r.rowNumber,
        rawJson: r.rawJson as Prisma.InputJsonValue,
        validationStatus: validateLeadRow(r.rawJson),
      })),
      skipDuplicates: true,
    });
    const updated = await this.prisma.importBatch.findFirst({
      where: { id: batchId },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    return ImportBatchResponseDto.from(updated!);
  }

  async commit(
    user: AuthUser,
    batchId: string,
  ): Promise<ImportBatchResponseDto> {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId },
      include: { rows: true },
    });
    if (!batch) throw new NotFoundException('Import batch not found');
    if (batch.status === 'COMMITTED') {
      throw new BadRequestException('Batch already committed');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const row of batch.rows) {
        if (row.validationStatus !== 'VALID' || row.resultingLeadId) continue;
        const raw = row.rawJson as Record<string, unknown>;
        const lead = await tx.lead.create({
          data: {
            source:
              typeof raw.source === 'string' && raw.source
                ? raw.source
                : 'import',
            status:
              typeof raw.status === 'string' && raw.status
                ? raw.status
                : 'NEW',
            name: typeof raw.name === 'string' ? raw.name : null,
            phone: typeof raw.phone === 'string' ? raw.phone : null,
            email: typeof raw.email === 'string' ? raw.email : null,
            taxId: typeof raw.taxId === 'string' ? raw.taxId : null,
            ownerId: user.id,
          },
        });
        await tx.importRow.update({
          where: { id: row.id },
          data: { resultingLeadId: lead.id },
        });
      }
      await tx.importBatch.update({
        where: { id: batchId },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
    });

    const updated = await this.prisma.importBatch.findFirst({
      where: { id: batchId },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    return ImportBatchResponseDto.from(updated!);
  }
}
