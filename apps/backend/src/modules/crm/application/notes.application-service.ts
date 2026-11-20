import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationPublisher } from '../../communication/application/notification.publisher';
import { OrderPolicy } from '../../finance/domain/policies/order.policy';
import { AuthUser } from '../../identity/domain/auth-user';
import {
  dedupeUserIds,
  orderMentionDedupeKey,
  orderMentionHref,
  orderMentionTitle,
  selectOrderMentionRecipients,
  truncateNoteContent,
  type MentionAccess,
} from '../domain/order-note-mention';

export type CreateNoteInput = {
  subjectType: string;
  subjectId: string;
  content: string;
  mentionedUserIds?: string[];
};

export type UpdateNoteInput = {
  content: string;
};

export type ListNotesInput = {
  subjectType: string;
  subjectId: string;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  assignedUserId: string;
  submitterUserId: string;
};

type MentionJoin = {
  userId: string;
  user?: { id: string; displayName: string } | null;
};

type NoteRow = {
  id: string;
  subjectType: string;
  subjectId: string;
  content: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  mentions?: MentionJoin[];
};

type MentionUserRow = {
  id: string;
  displayName: string;
  status: string;
  deletedAt: Date | null;
  userRoles: Array<{
    role: {
      rolePermissionGroups: Array<{
        permissionGroup: {
          groupPermissions: Array<{ permission: { code: string } | null }>;
        };
      }>;
    };
  }>;
};

const MENTION_USER_SELECT = {
  id: true,
  displayName: true,
  status: true,
  deletedAt: true,
  userRoles: {
    select: {
      role: {
        select: {
          rolePermissionGroups: {
            select: {
              permissionGroup: {
                select: {
                  groupPermissions: {
                    select: { permission: { select: { code: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class NotesApplicationService {
  private readonly logger = new Logger(NotesApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderPolicy: OrderPolicy,
    private readonly notifications: NotificationPublisher,
  ) {}

  async create(user: AuthUser, dto: CreateNoteInput) {
    const mentionedUserIds = dedupeUserIds(dto.mentionedUserIds);
    if (dto.subjectType === 'ORDER') {
      this.assertPermission(user, 'order.update');
      const order = await this.requireOrderInScope(user, dto.subjectId, 'update');
      const mentionUsers = await this.requireActiveMentionUsers(mentionedUserIds);
      const created = await this.prisma.note.create({
        data: {
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          content: dto.content,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          ...(mentionUsers.length
            ? {
                mentions: {
                  create: mentionUsers.map((mention) => ({ userId: mention.id })),
                },
              }
            : {}),
        },
      });
      await this.emitOrderMentions({
        actor: user,
        order,
        noteId: created.id,
        content: dto.content,
        mentionUsers,
      });
      return this.toResponse(created, user.displayName, mentionJoins(mentionUsers));
    }

    this.assertPermission(user, 'customer.update');
    if (mentionedUserIds.length > 0) {
      throw new BadRequestException(
        'mentionedUserIds is only supported for ORDER notes',
      );
    }
    const created = await this.prisma.note.create({
      data: {
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        content: dto.content,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
    });
    return this.toResponse(created, user.displayName, []);
  }

  async list(user: AuthUser, query: ListNotesInput) {
    if (query.subjectType === 'ORDER') {
      this.assertPermission(user, 'order.view');
      await this.requireOrderInScope(user, query.subjectId, 'view');
    } else {
      this.assertPermission(user, 'customer.view');
    }
    const notes = await this.prisma.note.findMany({
      where: { subjectType: query.subjectType, subjectId: query.subjectId },
      orderBy: { createdAt: 'desc' },
      include: {
        mentions: {
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    });
    const names = await this.authorNames(notes.map((note) => note.createdByUserId));
    return notes.map((note) =>
      this.toResponse(note, names.get(note.createdByUserId) ?? '', note.mentions),
    );
  }

  async update(user: AuthUser, id: string, dto: UpdateNoteInput) {
    const note = await this.requireNote(id);
    await this.assertCanMutate(user, note);
    const updated = await this.prisma.note.update({
      where: { id },
      data: { content: dto.content, updatedByUserId: user.id },
      include: {
        mentions: {
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    });
    const names = await this.authorNames([updated.createdByUserId]);
    return this.toResponse(
      updated,
      names.get(updated.createdByUserId) ?? '',
      updated.mentions,
    );
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const note = await this.requireNote(id);
    await this.assertCanMutate(user, note);
    await this.prisma.note.delete({ where: { id } });
  }

  private async emitOrderMentions(input: {
    actor: AuthUser;
    order: OrderRow;
    noteId: string;
    content: string;
    mentionUsers: MentionUserRow[];
  }): Promise<void> {
    try {
      const recipients = selectOrderMentionRecipients({
        actorUserId: input.actor.id,
        mentionedUserIds: input.mentionUsers.map((mention) => mention.id),
        users: input.mentionUsers.map(toMentionAccess),
        order: input.order,
        policy: this.orderPolicy,
      });
      const title = orderMentionTitle(input.actor.displayName, input.order.orderNumber);
      const body = truncateNoteContent(input.content);
      for (const recipientUserId of recipients) {
        await this.notifications.notify({
          recipientUserIds: [recipientUserId],
          type: 'order_mentioned',
          title,
          body,
          sourceType: 'order',
          sourceId: input.order.id,
          href: orderMentionHref(input.order.id),
          dedupeKey: orderMentionDedupeKey(input.noteId, recipientUserId),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`order_mentioned notify failed: ${message}`);
    }
  }

  private async assertCanMutate(
    user: AuthUser,
    note: { subjectType: string; subjectId: string; createdByUserId: string },
  ): Promise<void> {
    if (note.subjectType === 'ORDER') {
      if (user.id === note.createdByUserId) return;
      this.assertPermission(user, 'order.update');
      await this.requireOrderInScope(user, note.subjectId, 'update');
      return;
    }
    this.assertPermission(user, 'customer.update');
  }

  private async requireOrderInScope(
    user: AuthUser,
    orderId: string,
    mode: 'view' | 'update',
  ): Promise<OrderRow> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        assignedUserId: true,
        submitterUserId: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const allowed =
      mode === 'view'
        ? this.orderPolicy.canView(user.id, user.permissions, order)
        : this.orderPolicy.canUpdate(user.id, user.permissions, order);
    if (!allowed) throw new ForbiddenException('Outside data scope');
    return order;
  }

  private async requireActiveMentionUsers(ids: string[]): Promise<MentionUserRow[]> {
    if (ids.length === 0) return [];
    const rows = (await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: MENTION_USER_SELECT,
    })) as MentionUserRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const invalid = ids.filter((id) => {
      const row = byId.get(id);
      return !row || row.deletedAt != null || row.status !== 'ACTIVE';
    });
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Mentioned users must be existing ACTIVE users: ${invalid.join(', ')}`,
      );
    }
    return ids.map((id) => byId.get(id)!);
  }

  private async requireNote(id: string): Promise<NoteRow> {
    const note = await this.prisma.note.findFirst({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  private async authorNames(ids: string[]): Promise<Map<string, string>> {
    const unique = dedupeUserIds(ids);
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }

  private assertPermission(user: AuthUser, code: string): void {
    if (!user.permissions.includes(code)) {
      throw new ForbiddenException(`Missing permission: ${code}`);
    }
  }

  private toResponse(note: NoteRow, authorName: string, mentions: MentionJoin[]) {
    const ordered = [...mentions].sort((a, b) => a.userId.localeCompare(b.userId));
    return {
      id: note.id,
      subjectType: note.subjectType,
      subjectId: note.subjectId,
      content: note.content,
      authorUserId: note.createdByUserId,
      authorName,
      mentionedUserIds: ordered.map((mention) => mention.userId),
      mentionedUserNames: ordered.map((mention) => mention.user?.displayName ?? ''),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}

function mentionJoins(users: MentionUserRow[]): MentionJoin[] {
  return users.map((user) => ({
    userId: user.id,
    user: { id: user.id, displayName: user.displayName },
  }));
}

function toMentionAccess(row: MentionUserRow): MentionAccess {
  const permissions = new Set<string>();
  for (const userRole of row.userRoles) {
    for (const group of userRole.role.rolePermissionGroups) {
      for (const link of group.permissionGroup.groupPermissions) {
        if (link.permission?.code) permissions.add(link.permission.code);
      }
    }
  }
  return {
    id: row.id,
    status: row.status,
    deletedAt: row.deletedAt,
    permissions: [...permissions],
  };
}
