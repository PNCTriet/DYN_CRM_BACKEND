import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthPort } from '../domain/auth.port';
import { AuthUser } from '../domain/auth-user';

const DEFAULT_CACHE_TTL_MS = 45_000;

type AuthRow = {
  id: string;
  email: string | null;
  displayName: string;
  status: string;
  authSubjectId: string;
  roleCodes: unknown;
  permissionCodes: unknown;
};

type ClaimedAccess = {
  permissions: string[];
  roleCodes: string[];
};

/**
 * In-process permission cache. Invalidated on role, permission, and user
 * status writes in this process. Other instances observe changes within TTL.
 */
@Injectable()
export class IdentityAccessService {
  private readonly cache = new Map<string, { user: AuthUser; expiresAt: number }>();
  private readonly subjectToUserId = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authPort: AuthPort,
    private readonly config: ConfigService,
  ) {}

  /**
   * Token resolution:
   * - `test:<userId>` when AUTH_MODE=test (or AUTH_ALLOW_TEST_TOKENS=true)
   * - else Supabase JWT → users.auth_subject_id
   *
   * Production runs AUTH_MODE=supabase, so test tokens stay disabled.
   */
  async resolveFromToken(token: string): Promise<AuthUser | null> {
    const allowTest =
      this.config.get<string>('AUTH_MODE') === 'test' ||
      this.config.get<string>('AUTH_ALLOW_TEST_TOKENS') === 'true';

    if (allowTest && token.startsWith('test:')) {
      const userId = token.slice('test:'.length);
      return this.loadAuthUser(userId);
    }

    const subject = await this.authPort.getSubject(token);
    if (!subject) {
      return null;
    }
    const claims = claimedAccess(subject.permissionCodes, subject.roleCodes);
    return this.loadAuthUserBySubject(subject.subjectId, claims);
  }

  async loadAuthUserBySubject(
    authSubjectId: string,
    claims?: ClaimedAccess,
  ): Promise<AuthUser | null> {
    const cached = this.cacheGetBySubject(authSubjectId);
    if (cached) return cached;

    if (claims) {
      const row = await this.prisma.user.findFirst({
        where: { authSubjectId, deletedAt: null },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          authSubjectId: true,
        },
      });
      if (!row || isBlocked(row.status)) return null;
      const user = toAuthUser(
        row,
        claims.permissions,
        claims.roleCodes,
      );
      this.cacheSet(user, row.authSubjectId);
      return cloneAuthUser(user);
    }

    const loaded = await this.queryAuthUser({ authSubjectId });
    if (!loaded) return null;
    this.cacheSet(loaded.user, loaded.authSubjectId);
    return cloneAuthUser(loaded.user);
  }

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
    const cached = this.cacheGet(userId);
    if (cached) return cached;
    const loaded = await this.queryAuthUser({ id: userId });
    if (!loaded) return null;
    this.cacheSet(loaded.user, loaded.authSubjectId);
    return cloneAuthUser(loaded.user);
  }

  /** Drop one user after a status or role change. */
  invalidateUser(userId: string): void {
    this.cache.delete(userId);
    for (const [subject, id] of this.subjectToUserId) {
      if (id === userId) this.subjectToUserId.delete(subject);
    }
  }

  /** Drop everyone after a permission-group or role-group change. */
  invalidateAll(): void {
    this.cache.clear();
    this.subjectToUserId.clear();
  }

  /**
   * Provision Nest `users` row linked to IdP subject (signup / first login).
   *
   * Google users land here without `defaultRoleCode` and with
   * `status: PENDING_APPROVAL` — an admin must grant roles and activate them
   * before any RBAC-protected endpoint answers.
   */
  async ensureLocalUser(input: {
    authSubjectId: string;
    email: string;
    displayName: string;
    defaultRoleCode?: string | null;
    status?: UserStatus;
  }): Promise<AuthUser> {
    const existing = await this.prisma.user.findFirst({
      where: { authSubjectId: input.authSubjectId, deletedAt: null },
    });
    if (existing) {
      const loaded = await this.loadAuthUser(existing.id);
      if (!loaded) {
        throw new Error('Local user exists but is inactive');
      }
      return loaded;
    }

    const role = input.defaultRoleCode
      ? await this.prisma.role.findUnique({
          where: { code: input.defaultRoleCode },
        })
      : null;

    const created = await this.prisma.user.create({
      data: {
        authSubjectId: input.authSubjectId,
        email: input.email,
        displayName: input.displayName,
        status: input.status ?? UserStatus.ACTIVE,
        ...(role
          ? {
              userRoles: {
                create: [{ roleId: role.id }],
              },
            }
          : {}),
      },
    });

    const loaded = await this.loadAuthUser(created.id);
    if (!loaded) {
      throw new Error('Failed to load provisioned user');
    }
    return loaded;
  }

  /**
   * One SQL round trip for the user row plus permission codes.
   * Replaces the per-request 6-level Prisma include.
   */
  private async queryAuthUser(
    where: { id: string } | { authSubjectId: string },
  ): Promise<{ user: AuthUser; authSubjectId: string } | null> {
    const filter =
      'id' in where
        ? Prisma.sql`u.id = ${where.id}::uuid`
        : Prisma.sql`u.auth_subject_id = ${where.authSubjectId}`;

    const rows = await this.prisma.$queryRaw<AuthRow[]>(Prisma.sql`
      SELECT
        u.id,
        u.email,
        u.display_name AS "displayName",
        u.status::text AS status,
        u.auth_subject_id AS "authSubjectId",
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.code), NULL), ARRAY[]::text[]) AS "roleCodes",
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.code), NULL), ARRAY[]::text[]) AS "permissionCodes"
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permission_groups rpg ON rpg.role_id = r.id
      LEFT JOIN group_permissions gp ON gp.permission_group_id = rpg.permission_group_id
      LEFT JOIN permissions p ON p.id = gp.permission_id
      WHERE u.deleted_at IS NULL
        AND ${filter}
      GROUP BY u.id
    `);

    const row = rows[0];
    if (!row || isBlocked(row.status)) return null;
    return {
      authSubjectId: row.authSubjectId,
      user: toAuthUser(row, asStringArray(row.permissionCodes), asStringArray(row.roleCodes)),
    };
  }

  private ttlMs(): number {
    const raw = this.config.get<string>('AUTH_USER_CACHE_TTL_MS');
    if (raw === undefined || raw === '') return DEFAULT_CACHE_TTL_MS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_CACHE_TTL_MS;
    return parsed;
  }

  private cacheGet(userId: string): AuthUser | undefined {
    const ttl = this.ttlMs();
    if (ttl === 0) return undefined;
    const hit = this.cache.get(userId);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.cache.delete(userId);
      return undefined;
    }
    return cloneAuthUser(hit.user);
  }

  private cacheGetBySubject(authSubjectId: string): AuthUser | undefined {
    const userId = this.subjectToUserId.get(authSubjectId);
    if (!userId) return undefined;
    return this.cacheGet(userId);
  }

  private cacheSet(user: AuthUser, authSubjectId: string): void {
    const ttl = this.ttlMs();
    if (ttl === 0) return;
    this.cache.set(user.id, {
      user: cloneAuthUser(user),
      expiresAt: Date.now() + ttl,
    });
    this.subjectToUserId.set(authSubjectId, user.id);
  }
}

function isBlocked(status: string): boolean {
  return status === 'SUSPENDED' || status === 'DEACTIVATED';
}

function toAuthUser(
  row: { id: string; email: string | null; displayName: string; status: string },
  permissions: string[],
  roleCodes: string[],
): AuthUser {
  return {
    id: row.id,
    email: row.email ?? '',
    displayName: row.displayName,
    status: row.status,
    permissions: [...new Set(permissions)].sort(),
    roleCodes: [...new Set(roleCodes)].sort(),
  };
}

function cloneAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    permissions: [...user.permissions],
    roleCodes: [...user.roleCodes],
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

/**
 * Trust hook claims only when they actually grant permissions.
 * Empty arrays fall back to the database so a broken hook cannot lock users out.
 */
function claimedAccess(
  permissionCodes: string[] | undefined,
  roleCodes: string[] | undefined,
): ClaimedAccess | undefined {
  if (!permissionCodes || !roleCodes || permissionCodes.length === 0) {
    return undefined;
  }
  return { permissions: permissionCodes, roleCodes };
}
