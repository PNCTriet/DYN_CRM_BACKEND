import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { ServicePolicy } from '../domain/policies/service.policy';
import { ServiceRepository } from '../infrastructure/prisma/service.repository';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { ServiceResponseDto } from './dto/service-response.dto';

@Injectable()
export class ServiceApplicationService {
  constructor(
    private readonly repo: ServiceRepository,
    private readonly policy: ServicePolicy,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    const created = await this.repo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      unitPrice:
        dto.unitPrice !== undefined
          ? new Prisma.Decimal(dto.unitPrice)
          : undefined,
      processingDays: dto.processingDays,
      status: dto.status ?? 'ACTIVE',
      customFields: dto.customFields
        ? (dto.customFields as Prisma.InputJsonValue)
        : undefined,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return ServiceResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListServicesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      createdByUserId: filter.ownerId,
      search: query.search,
      status: query.status,
      category: query.category,
    });
    return {
      items: rows.map((r) => ServiceResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<ServiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Service not found');
    if (!this.policy.canView(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    return ServiceResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Service not found');
    if (!this.policy.canUpdate(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    const updated = await this.repo.update(id, {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.unitPrice !== undefined
        ? { unitPrice: new Prisma.Decimal(dto.unitPrice) }
        : {}),
      ...(dto.processingDays !== undefined
        ? { processingDays: dto.processingDays }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.customFields !== undefined
        ? { customFields: dto.customFields as Prisma.InputJsonValue }
        : {}),
      updatedByUserId: user.id,
    });
    return ServiceResponseDto.from(updated);
  }

  async archive(user: AuthUser, id: string): Promise<ServiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Service not found');
    if (!this.policy.canUpdate(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    const updated = await this.repo.update(id, {
      status: 'ARCHIVED',
      updatedByUserId: user.id,
    });
    return ServiceResponseDto.from(updated);
  }
}
