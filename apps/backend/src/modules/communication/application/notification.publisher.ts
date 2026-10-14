import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationRepository } from '../infrastructure/prisma/notification.repository';

export type NotifyInput = {
  recipientUserIds: string[];
  type: string;
  title: string;
  body?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  href?: string | null;
  dedupeKey: string;
};

/**
 * Writes inbox rows from domain commands. Failures are logged and swallowed
 * so order/expense commands still succeed.
 */
@Injectable()
export class NotificationPublisher {
  private readonly logger = new Logger(NotificationPublisher.name);

  constructor(
    private readonly repo: NotificationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const ids = [
      ...new Set(input.recipientUserIds.filter((id) => !!id)),
    ];
    if (ids.length === 0) return;
    try {
      for (const recipientUserId of ids) {
        await this.insertOrReturn(recipientUserId, input);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`notify failed: ${message}`);
    }
  }

  /** ACTIVE users whose roles include expense.approve, excluding one id. */
  async expenseApproverIds(excludeUserId?: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        userRoles: {
          some: {
            role: {
              rolePermissionGroups: {
                some: {
                  permissionGroup: {
                    groupPermissions: {
                      some: { permission: { code: 'expense.approve' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async insertOrReturn(recipientUserId: string, input: NotifyInput) {
    const existing = await this.repo.findByDedupe(
      recipientUserId,
      input.dedupeKey,
    );
    if (existing) return existing;
    try {
      return await this.repo.create({
        recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        href: input.href ?? null,
        dedupeKey: input.dedupeKey,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return this.repo.findByDedupe(recipientUserId, input.dedupeKey);
      }
      throw err;
    }
  }
}
