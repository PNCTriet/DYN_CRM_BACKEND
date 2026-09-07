import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollaboratorStatus } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { CollaboratorRepository } from '../infrastructure/prisma/collaborator.repository';
import {
  AssignCollaboratorCustomerDto,
  CollaboratorCustomerResponseDto,
  CollaboratorResponseDto,
  CreateCollaboratorDto,
  ListCollaboratorsQueryDto,
  UpdateCollaboratorDto,
} from './dto/collaborator.dto';

@Injectable()
export class CollaboratorApplicationService {
  constructor(private readonly repo: CollaboratorRepository) {}

  async create(
    user: AuthUser,
    dto: CreateCollaboratorDto,
  ): Promise<CollaboratorResponseDto> {
    const linked = await this.repo.findUser(dto.userId);
    if (!linked) throw new BadRequestException('User not found');
    const created = await this.repo.create({
      userId: dto.userId,
      displayName: dto.displayName,
      phone: dto.phone,
      email: dto.email,
      notes: dto.notes,
      status: CollaboratorStatus.ACTIVE,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return CollaboratorResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListCollaboratorsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: query.search,
      status: query.status,
    });
    return {
      items: rows.map((r) => CollaboratorResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<CollaboratorResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    return CollaboratorResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateCollaboratorDto,
  ): Promise<CollaboratorResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    const updated = await this.repo.update(id, {
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      updatedByUserId: user.id,
    });
    return CollaboratorResponseDto.from(updated);
  }

  async deactivate(
    user: AuthUser,
    id: string,
  ): Promise<CollaboratorResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    const updated = await this.repo.update(id, {
      status: CollaboratorStatus.INACTIVE,
      updatedByUserId: user.id,
    });
    return CollaboratorResponseDto.from(updated);
  }

  async assignCustomer(
    user: AuthUser,
    id: string,
    dto: AssignCollaboratorCustomerDto,
  ): Promise<CollaboratorCustomerResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    const customer = await this.repo.findCustomer(dto.customerId);
    if (!customer) throw new BadRequestException('Customer not found');
    const link = await this.repo.assignCustomer(id, dto.customerId);
    return CollaboratorCustomerResponseDto.from(link);
  }

  async unassignCustomer(
    user: AuthUser,
    id: string,
    customerId: string,
  ): Promise<void> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    try {
      await this.repo.unassignCustomer(id, customerId);
    } catch {
      throw new NotFoundException('Collaborator-customer link not found');
    }
  }

  async listCustomers(user: AuthUser, id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Collaborator not found');
    const rows = await this.repo.listCustomers(id);
    return {
      items: rows.map((r) => CollaboratorCustomerResponseDto.from(r)),
    };
  }
}
