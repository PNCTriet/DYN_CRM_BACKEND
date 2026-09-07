import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractRequestStatus } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { ContractRequestRepository } from '../infrastructure/prisma/contract-request.repository';
import {
  ApproveContractRequestDto,
  ContractRequestResponseDto,
  CreateContractRequestDto,
  ListContractRequestsQueryDto,
  ReviewContractRequestDto,
  UpdateContractRequestDto,
} from './dto/contract-request.dto';

@Injectable()
export class ContractRequestApplicationService {
  constructor(private readonly repo: ContractRequestRepository) {}

  async create(
    user: AuthUser,
    dto: CreateContractRequestDto,
  ): Promise<ContractRequestResponseDto> {
    const collab = await this.repo.findCollaborator(dto.collaboratorId);
    if (!collab) throw new BadRequestException('Collaborator not found');
    const created = await this.repo.create({
      collaborator: { connect: { id: dto.collaboratorId } },
      title: dto.title,
      description: dto.description,
      customerId: dto.customerId,
      leadId: dto.leadId,
      status: ContractRequestStatus.SUBMITTED,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return ContractRequestResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListContractRequestsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      status: query.status,
      collaboratorId: query.collaboratorId,
    });
    return {
      items: rows.map((r) => ContractRequestResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(
    user: AuthUser,
    id: string,
  ): Promise<ContractRequestResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract request not found');
    return ContractRequestResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateContractRequestDto,
  ): Promise<ContractRequestResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract request not found');
    if (
      record.status !== ContractRequestStatus.DRAFT &&
      record.status !== ContractRequestStatus.NEEDS_INFO &&
      record.status !== ContractRequestStatus.SUBMITTED
    ) {
      throw new BadRequestException('Cannot update request in current status');
    }
    const updated = await this.repo.update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
      ...(dto.leadId !== undefined ? { leadId: dto.leadId } : {}),
      updatedByUserId: user.id,
    });
    return ContractRequestResponseDto.from(updated);
  }

  async review(
    user: AuthUser,
    id: string,
    dto: ReviewContractRequestDto,
  ): Promise<ContractRequestResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract request not found');
    this.assertNotOwnRequest(user, record.collaborator.userId);
    const updated = await this.repo.update(id, {
      status: ContractRequestStatus.IN_REVIEW,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNote: dto.note,
      updatedByUserId: user.id,
    });
    return ContractRequestResponseDto.from(updated);
  }

  async approve(
    user: AuthUser,
    id: string,
    dto: ApproveContractRequestDto,
  ): Promise<ContractRequestResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract request not found');
    this.assertNotOwnRequest(user, record.collaborator.userId);
    if (dto.approvedContractId) {
      const contract = await this.repo.findContract(dto.approvedContractId);
      if (!contract) throw new BadRequestException('Contract not found');
    }
    const updated = await this.repo.update(id, {
      status: ContractRequestStatus.APPROVED,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNote: dto.note,
      approvedContractId: dto.approvedContractId,
      updatedByUserId: user.id,
    });
    return ContractRequestResponseDto.from(updated);
  }

  async reject(
    user: AuthUser,
    id: string,
    dto: ReviewContractRequestDto,
  ): Promise<ContractRequestResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contract request not found');
    this.assertNotOwnRequest(user, record.collaborator.userId);
    const updated = await this.repo.update(id, {
      status: ContractRequestStatus.REJECTED,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNote: dto.note,
      updatedByUserId: user.id,
    });
    return ContractRequestResponseDto.from(updated);
  }

  private assertNotOwnRequest(user: AuthUser, collaboratorUserId: string) {
    if (collaboratorUserId === user.id) {
      throw new ForbiddenException(
        'Collaborator cannot approve or review own contract request',
      );
    }
  }
}
