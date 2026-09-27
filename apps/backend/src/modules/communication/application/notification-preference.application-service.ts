import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { NotificationPreferenceRepository } from '../infrastructure/prisma/notification-preference.repository';
import {
  NotificationPreferenceResponseDto,
  UpsertNotificationPreferenceDto,
} from './dto/mail.dto';

@Injectable()
export class NotificationPreferenceApplicationService {
  constructor(private readonly repo: NotificationPreferenceRepository) {}

  async listOwn(user: AuthUser) {
    const rows = await this.repo.findByUser(user.id);
    return rows.map((r) => NotificationPreferenceResponseDto.from(r));
  }

  async upsertOwn(user: AuthUser, dto: UpsertNotificationPreferenceDto) {
    const row = await this.repo.upsert({
      userId: user.id,
      channel: dto.channel,
      eventType: dto.eventType,
      enabled: dto.enabled,
      channelAddress: dto.channelAddress,
    });
    return NotificationPreferenceResponseDto.from(row);
  }

  /**
   * Default = enabled when no preference row.
   * Specific eventType wins over "*".
   */
  async isChannelEnabled(
    userId: string,
    channel: string,
    eventType: string,
  ): Promise<boolean> {
    const specific = await this.repo.findOne(userId, channel, eventType);
    if (specific) return specific.enabled;
    const wildcard = await this.repo.findOne(userId, channel, '*');
    if (wildcard) return wildcard.enabled;
    return true;
  }
}
