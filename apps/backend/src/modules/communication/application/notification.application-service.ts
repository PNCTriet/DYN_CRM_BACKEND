import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { NotificationRepository } from '../infrastructure/prisma/notification.repository';
import {
  ListNotificationsQueryDto,
  NotificationResponseDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationApplicationService {
  constructor(private readonly repo: NotificationRepository) {}

  async listOwn(user: AuthUser, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      recipientUserId: user.id,
    });
    return {
      items: rows.map((r) => NotificationResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async markRead(
    user: AuthUser,
    id: string,
  ): Promise<NotificationResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Notification not found');
    if (record.recipientUserId !== user.id) {
      throw new ForbiddenException('Outside data scope');
    }
    const updated = await this.repo.markRead(id);
    return NotificationResponseDto.from(updated);
  }
}
