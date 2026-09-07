import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { ContractPolicy } from '../domain/policies/contract.policy';
import { ContractRepository } from '../infrastructure/prisma/contract.repository';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ListContractsQueryDto } from './dto/list-contracts-query.dto';
import { ChangeContractStatusDto } from './dto/change-contract-status.dto';
import { ContractResponseDto } from './dto/contract-response.dto';

@Injectable()
export class ContractApplicationService {
  constructor(
    private readonly repo: ContractRepository,
    private readonly policy: ContractPolicy,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateContractDto,
  ): Promise<ContractResponseDto> {
    const customer = await this.repo.findCustomerOwnerId(dto.customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    const created = await this.repo.create({
      contractNumber: dto.contractNumber,
      status: ContractStatus.DRAFT,
      title: dto.title,
      description: dto.description,
      customer: { connect: { id: dto.customerId } },
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return ContractResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListContractsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      customerOwnerId: filter.ownerId,
      search: query.search,
      status: query.status,
      customerId: query.customerId,
    });
    return {
      items: rows.map((r) => ContractResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<ContractResponseDto> {
    const record = await this.requireScoped(user, id, 'view');
    return ContractResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateContractDto,
  ): Promise<ContractResponseDto> {
    await this.requireScoped(user, id, 'update');
    if (dto.customerId) {
      const customer = await this.repo.findCustomerOwnerId(dto.customerId);
      if (!customer) throw new NotFoundException('Customer not found');
    }
    const updated = await this.repo.update(id, {
      ...(dto.contractNumber !== undefined
        ? { contractNumber: dto.contractNumber }
        : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.customerId !== undefined
        ? { customer: { connect: { id: dto.customerId } } }
        : {}),
      updatedByUserId: user.id,
    });
    return ContractResponseDto.from(updated);
  }

  async softDelete(user: AuthUser, id: string): Promise<void> {
    await this.requireScoped(user, id, 'update');
    await this.repo.softDelete(id, user.id);
  }

  async changeStatus(
    user: AuthUser,
    id: string,
    dto: ChangeContractStatusDto,
  ): Promise<ContractResponseDto> {
    await this.requireScoped(user, id, 'update');
    const data: {
      status: ContractStatus;
      updatedByUserId: string;
      signedAt?: Date;
    } = {
      status: dto.status,
      updatedByUserId: user.id,
    };
    if (dto.status === ContractStatus.SIGNED) {
      data.signedAt = new Date();
    }
    const updated = await this.repo.update(id, data);
    return ContractResponseDto.from(updated);
  }

  private async requireScoped(
    user: AuthUser,
    id: string,
    mode: 'view' | 'update',
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract not found');
    const scopeRecord = {
      id: record.id,
      customerOwnerId: record.customer.ownerId,
      createdByUserId: record.createdByUserId,
    };
    const ok =
      mode === 'view'
        ? this.policy.canView(user.id, user.permissions, scopeRecord)
        : this.policy.canUpdate(user.id, user.permissions, scopeRecord);
    if (!ok) throw new ForbiddenException('Outside data scope');
    return record;
  }
}
