import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { ReminderRepository } from '../infrastructure/prisma/reminder.repository';
import {
  CreateReminderDto,
  ListRemindersQueryDto,
  ReminderResponseDto,
  UpdateReminderDto,
} from './dto/reminder.dto';

@Injectable()
export class ReminderApplicationService {
  constructor(private readonly repo: ReminderRepository) {}

  async create(
    user: AuthUser,
    dto: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    const recipientUserId = dto.recipientUserId ?? user.id;
    const created = await this.repo.create({
      recipientUserId,
      title: dto.title,
      description: dto.description,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      remindAt: new Date(dto.remindAt),
      status: 'PENDING',
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return ReminderResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListRemindersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      recipientUserId: user.id,
      status: query.status,
    });
    return {
      items: rows.map((r) => ReminderResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<ReminderResponseDto> {
    const record = await this.requireOwn(user, id);
    return ReminderResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    await this.requireOwn(user, id);
    const updated = await this.repo.update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.remindAt !== undefined
        ? { remindAt: new Date(dto.remindAt) }
        : {}),
      updatedByUserId: user.id,
    });
    return ReminderResponseDto.from(updated);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    await this.requireOwn(user, id);
    await this.repo.delete(id);
  }

  async complete(user: AuthUser, id: string): Promise<ReminderResponseDto> {
    await this.requireOwn(user, id);
    const updated = await this.repo.update(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedByUserId: user.id,
    });
    return ReminderResponseDto.from(updated);
  }

  private async requireOwn(user: AuthUser, id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Reminder not found');
    if (record.recipientUserId !== user.id) {
      throw new ForbiddenException('Outside data scope');
    }
    return record;
  }
}
