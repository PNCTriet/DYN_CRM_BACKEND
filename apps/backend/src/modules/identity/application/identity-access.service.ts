import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthPort } from '../domain/auth.port';
import { AuthUser } from '../domain/auth-user';

@Injectable()
export class IdentityAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authPort: AuthPort,
    private readonly config: ConfigService,
  ) {}

  /**
   * Token resolution:
   * - `test:<userId>` when AUTH_MODE=test (or AUTH_ALLOW_TEST_TOKENS=true)
   * - else Supabase JWT → users.auth_subject_id
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
    return this.loadAuthUserBySubject(subject.subjectId);
  }

  async loadAuthUserBySubject(authSubjectId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { authSubjectId, deletedAt: null },
    });
    if (!user) return null;
    return this.loadAuthUser(user.id);
  }

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissionGroups: {
                  include: {
                    permissionGroup: {
                      include: {
                        groupPermissions: {
                          include: { permission: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      return null;
    }

    const permissions = new Set<string>();
    const roleCodes: string[] = [];
    for (const ur of user.userRoles) {
      roleCodes.push(ur.role.code);
      for (const rpg of ur.role.rolePermissionGroups) {
        for (const gp of rpg.permissionGroup.groupPermissions) {
          permissions.add(gp.permission.code);
        }
      }
    }

    return {
      id: user.id,
      email: user.email ?? '',
      displayName: user.displayName,
      status: user.status,
      permissions: [...permissions],
      roleCodes,
    };
  }

  /**
   * Provision Nest `users` row linked to IdP subject (signup / first login).
   */
  async ensureLocalUser(input: {
    authSubjectId: string;
    email: string;
    displayName: string;
    defaultRoleCode: string;
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

    const role = await this.prisma.role.findUnique({
      where: { code: input.defaultRoleCode },
    });

    const created = await this.prisma.user.create({
      data: {
        authSubjectId: input.authSubjectId,
        email: input.email,
        displayName: input.displayName,
        status: 'ACTIVE',
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
}
