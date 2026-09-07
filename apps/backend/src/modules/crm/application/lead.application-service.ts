import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerType } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { LeadPolicy } from '../domain/policies/lead.policy';
import { LeadRepository } from '../infrastructure/prisma/lead.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';

const TERMINAL = new Set(['CONVERTED', 'DISQUALIFIED']);

@Injectable()
export class LeadApplicationService {
  constructor(
    private readonly repo: LeadRepository,
    private readonly policy: LeadPolicy,
  ) {}

  async create(user: AuthUser, dto: CreateLeadDto): Promise<LeadResponseDto> {
    let ownerId = user.id;
    if (dto.ownerId && dto.ownerId !== user.id) {
      if (!user.permissions.includes('lead.assign')) {
        throw new ForbiddenException('Missing permission: lead.assign');
      }
      ownerId = dto.ownerId;
    }
    const created = await this.repo.create({
      source: dto.source,
      status: dto.status ?? 'NEW',
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      taxId: dto.taxId,
      owner: { connect: { id: ownerId } },
    });
    return LeadResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListLeadsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      ownerId: filter.ownerId,
      status: query.status,
      search: query.search,
    });
    return {
      items: rows.map((r) => LeadResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<LeadResponseDto> {
    const record = await this.requireScoped(user, id, 'view');
    return LeadResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    const record = await this.requireScoped(user, id, 'update');
    if (record.status === 'CONVERTED' && dto.status && dto.status !== 'CONVERTED') {
      throw new BadRequestException('Cannot change status of a converted lead');
    }
    if (dto.ownerId && dto.ownerId !== record.ownerId) {
      if (!user.permissions.includes('lead.assign')) {
        throw new ForbiddenException('Missing permission: lead.assign');
      }
    }
    const updated = await this.repo.update(id, {
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
      ...(dto.ownerId !== undefined
        ? dto.ownerId
          ? { owner: { connect: { id: dto.ownerId } } }
          : { owner: { disconnect: true } }
        : {}),
    });
    return LeadResponseDto.from(updated);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const record = await this.requireScoped(user, id, 'update');
    if (record.status === 'CONVERTED') {
      throw new BadRequestException('Cannot delete a converted lead');
    }
    await this.repo.delete(id);
  }

  async convert(
    user: AuthUser,
    id: string,
    dto: ConvertLeadDto,
  ): Promise<{ lead: LeadResponseDto; customer: CustomerResponseDto }> {
    if (!user.permissions.includes('lead.convert')) {
      throw new ForbiddenException('Missing permission: lead.convert');
    }
    const record = await this.requireScoped(user, id, 'update');
    if (record.convertedCustomerId || record.status === 'CONVERTED') {
      throw new ConflictException('Lead already converted');
    }
    if (TERMINAL.has(record.status) && record.status !== 'QUALIFIED') {
      // Allow convert from NEW/IN_PROGRESS/QUALIFIED; block DISQUALIFIED
      if (record.status === 'DISQUALIFIED') {
        throw new BadRequestException('Cannot convert a disqualified lead');
      }
    }

    const legalName =
      dto.legalName?.trim() || record.name?.trim() || 'Unnamed customer';
    const displayName = dto.displayName?.trim() || legalName;
    const ownerId = record.ownerId ?? user.id;

    const { lead, customer } = await this.repo.convert({
      leadId: id,
      status: 'CONVERTED',
      customer: {
        type: dto.type as CustomerType,
        legalName,
        displayName,
        industryOrField: dto.industryOrField,
        phone: record.phone,
        email: record.email,
        taxId: record.taxId,
        owner: { connect: { id: ownerId } },
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
    });

    return {
      lead: LeadResponseDto.from(lead),
      customer: CustomerResponseDto.from(customer),
    };
  }

  private async requireScoped(
    user: AuthUser,
    id: string,
    mode: 'view' | 'update',
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Lead not found');
    const ok =
      mode === 'view'
        ? this.policy.canView(user.id, user.permissions, record)
        : this.policy.canUpdate(user.id, user.permissions, record);
    if (!ok) throw new ForbiddenException('Outside data scope');
    return record;
  }
}
