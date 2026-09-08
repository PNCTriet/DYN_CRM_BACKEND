import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerType } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { CustomerPolicy } from '../domain/policies/customer.policy';
import { CustomerRepository } from '../infrastructure/prisma/customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';

@Injectable()
export class CustomerApplicationService {
  constructor(
    private readonly repo: CustomerRepository,
    private readonly policy: CustomerPolicy,
  ) {}

  async create(user: AuthUser, dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    let ownerId = user.id;
    if (dto.ownerId && dto.ownerId !== user.id) {
      if (!user.permissions.includes('customer.assign')) {
        throw new ForbiddenException('Missing permission: customer.assign');
      }
      ownerId = dto.ownerId;
    }

    const created = await this.repo.create({
      type: dto.type as CustomerType,
      legalName: dto.legalName,
      displayName: dto.displayName,
      industryOrField: dto.industryOrField,
      phone: dto.phone,
      email: dto.email,
      taxId: dto.taxId,
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      owner: { connect: { id: ownerId } },
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return CustomerResponseDto.from(created);
  }

  async list(
    user: AuthUser,
    query: ListCustomersQueryDto,
  ): Promise<{ items: CustomerResponseDto[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      ownerId: filter.ownerId,
      search: query.search,
      status: query.status,
    });
    return {
      items: rows.map((r) => CustomerResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<CustomerResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('Customer not found');
    }
    if (!this.policy.canView(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    return CustomerResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('Customer not found');
    }
    if (!this.policy.canUpdate(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    if (dto.ownerId && dto.ownerId !== record.ownerId) {
      if (!user.permissions.includes('customer.assign')) {
        throw new ForbiddenException('Missing permission: customer.assign');
      }
    }

    const updated = await this.repo.update(id, {
      ...(dto.type !== undefined ? { type: dto.type as CustomerType } : {}),
      ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.industryOrField !== undefined
        ? { industryOrField: dto.industryOrField }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.ownerId !== undefined
        ? { owner: { connect: { id: dto.ownerId } } }
        : {}),
      updatedByUserId: user.id,
    });
    return CustomerResponseDto.from(updated);
  }

  async softDelete(user: AuthUser, id: string): Promise<void> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('Customer not found');
    }
    if (!this.policy.canUpdate(user.id, user.permissions, record)) {
      throw new ForbiddenException('Outside data scope');
    }
    await this.repo.softDelete(id, user.id);
  }
}
