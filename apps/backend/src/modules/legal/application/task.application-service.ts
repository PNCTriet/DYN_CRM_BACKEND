import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { TaskPolicy } from '../domain/policies/task.policy';
import { TaskRepository } from '../infrastructure/prisma/task.repository';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TaskApplicationService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly policy: TaskPolicy,
  ) {}

  async create(user: AuthUser, dto: CreateTaskDto) {
    const contract = await this.repo.findContract(dto.contractId);
    if (!contract) throw new NotFoundException('Contract not found');

    return this.repo.create({
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'OPEN',
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      assigneeUserId: dto.assigneeUserId,
      contract: { connect: { id: dto.contractId } },
      ...(dto.instanceId
        ? { instance: { connect: { id: dto.instanceId } } }
        : {}),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
  }

  async list(user: AuthUser, query: ListTasksQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [items, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      ownUserId: filter.ownerId,
      contractId: query.contractId,
      status: query.status,
      assigneeUserId: query.assigneeUserId,
    });
    return { items, total, page, pageSize };
  }

  async getById(user: AuthUser, id: string) {
    return this.requireScoped(user, id, 'view');
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    await this.requireScoped(user, id, 'update');
    return this.repo.update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.assigneeUserId !== undefined
        ? { assigneeUserId: dto.assigneeUserId }
        : {}),
      ...(dto.dueAt !== undefined
        ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.completed === true
        ? { completedAt: new Date(), status: dto.status ?? 'DONE' }
        : dto.completed === false
          ? { completedAt: null }
          : {}),
      updatedByUserId: user.id,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.requireScoped(user, id, 'update');
    await this.repo.delete(id);
  }

  private async requireScoped(
    user: AuthUser,
    id: string,
    mode: 'view' | 'update',
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Task not found');
    const ok =
      mode === 'view'
        ? this.policy.canView(user.id, user.permissions, record)
        : this.policy.canUpdate(user.id, user.permissions, record);
    if (!ok) throw new ForbiddenException('Outside data scope');
    return record;
  }
}
