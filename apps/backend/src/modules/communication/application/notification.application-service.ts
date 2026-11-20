import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import {
  emptyCategoryCounts,
  isNotificationCategory,
  type NotificationCategory,
} from '../domain/notification-category';
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
      category: query.category,
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

  async unreadCount(user: AuthUser): Promise<{
    total: number;
    byCategory: Record<NotificationCategory, number>;
  }> {
    const groups = await this.repo.countUnreadByCategory(user.id);
    const byCategory = emptyCategoryCounts();
    let total = 0;
    for (const group of groups) {
      const count = group._count._all;
      total += count;
      if (isNotificationCategory(group.category)) {
        byCategory[group.category] += count;
      }
    }
    return { total, byCategory };
  }

  async markAllRead(
    user: AuthUser,
    category?: NotificationCategory,
  ): Promise<{ updated: number }> {
    const result = await this.repo.markAllRead(user.id, category);
    return { updated: result.count };
  }
}
