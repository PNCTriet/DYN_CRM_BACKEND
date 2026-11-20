import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { categoryForType } from '../domain/notification-category';
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

  async notify(
    input: NotifyInput,
  ): Promise<{ inserted: number; existing: number }> {
    const ids = [...new Set(input.recipientUserIds.filter((id) => !!id))];
    if (ids.length === 0) return { inserted: 0, existing: 0 };
    let inserted = 0;
    let existing = 0;
    try {
      for (const recipientUserId of ids) {
        const created = await this.insertOrReturn(recipientUserId, input);
        if (created) inserted += 1;
        else existing += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`notify failed: ${message}`);
    }
    return { inserted, existing };
  }

  /** ACTIVE users whose roles include expense.approve, excluding one id. */
  expenseApproverIds(excludeUserId?: string): Promise<string[]> {
    return this.activeUserIdsWithPermission('expense.approve', excludeUserId);
  }

  /** ACTIVE users whose roles include `permissionCode`, excluding one id. */
  async activeUserIdsWithPermission(
    permissionCode: string,
    excludeUserId?: string,
  ): Promise<string[]> {
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
                      some: { permission: { code: permissionCode } },
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
    return rows.map((row) => row.id);
  }

  /** @returns true when a new row was inserted. */
  private async insertOrReturn(
    recipientUserId: string,
    input: NotifyInput,
  ): Promise<boolean> {
    const existing = await this.repo.findByDedupe(
      recipientUserId,
      input.dedupeKey,
    );
    if (existing) return false;
    try {
      await this.repo.create({
        recipientUserId,
        type: input.type,
        category: categoryForType(input.type),
        title: input.title,
        body: input.body ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        href: input.href ?? null,
        dedupeKey: input.dedupeKey,
      });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return false;
      }
      throw err;
    }
  }
}
