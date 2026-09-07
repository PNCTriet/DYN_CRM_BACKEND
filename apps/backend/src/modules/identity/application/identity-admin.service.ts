import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePermissionDto,
  CreatePermissionGroupDto,
  CreateRoleDto,
  CreateUserDto,
  ListUsersQueryDto,
  SetGroupPermissionsDto,
  SetRolePermissionGroupsDto,
  SetUserRolesDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/identity-admin.dto';

@Injectable()
export class IdentityAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Users ──────────────────────────────────────────────

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as UserStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { userRoles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => this.mapUser(u)),
      total,
      page,
      pageSize,
    };
  }

  async getUser(id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    });
    if (!u) throw new NotFoundException('User not found');
    return this.mapUser(u);
  }

  async createUser(dto: CreateUserDto) {
    const roleCodes = dto.roleCodes ?? [];
    const roles =
      roleCodes.length > 0
        ? await this.prisma.role.findMany({ where: { code: { in: roleCodes } } })
        : [];
    if (roles.length !== roleCodes.length) {
      throw new BadRequestException('One or more roleCodes not found');
    }
    const created = await this.prisma.user.create({
      data: {
        authSubjectId: dto.authSubjectId ?? `local:${randomUUID()}`,
        email: dto.email,
        displayName: dto.displayName,
        phone: dto.phone,
        status: (dto.status as UserStatus) ?? 'ACTIVE',
        userRoles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      include: { userRoles: { include: { role: true } } },
    });
    return this.mapUser(created);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.requireUser(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.status !== undefined ? { status: dto.status as UserStatus } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      include: { userRoles: { include: { role: true } } },
    });
    return this.mapUser(updated);
  }

  async softDeleteUser(id: string) {
    await this.requireUser(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DEACTIVATED' },
    });
  }

  async setUserRoles(id: string, dto: SetUserRolesDto) {
    await this.requireUser(id);
    const roles = await this.prisma.role.findMany({
      where: { code: { in: dto.roleCodes } },
    });
    if (roles.length !== dto.roleCodes.length) {
      throw new BadRequestException('One or more roleCodes not found');
    }
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      }),
    ]);
    return this.getUser(id);
  }

  // ── Roles ──────────────────────────────────────────────

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      include: {
        rolePermissionGroups: { include: { permissionGroup: true } },
      },
    });
    return roles.map((r) => this.mapRole(r));
  }

  async getRole(id: string) {
    const r = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissionGroups: { include: { permissionGroup: true } },
      },
    });
    if (!r) throw new NotFoundException('Role not found');
    return this.mapRole(r);
  }

  async createRole(dto: CreateRoleDto) {
    const r = await this.prisma.role.create({
      data: { code: dto.code, name: dto.name },
      include: {
        rolePermissionGroups: { include: { permissionGroup: true } },
      },
    });
    return this.mapRole(r);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.requireRole(id);
    const r = await this.prisma.role.update({
      where: { id },
      data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
      include: {
        rolePermissionGroups: { include: { permissionGroup: true } },
      },
    });
    return this.mapRole(r);
  }

  async setRolePermissionGroups(id: string, dto: SetRolePermissionGroupsDto) {
    await this.requireRole(id);
    const groups = await this.prisma.permissionGroup.findMany({
      where: { code: { in: dto.permissionGroupCodes } },
    });
    if (groups.length !== dto.permissionGroupCodes.length) {
      throw new BadRequestException('One or more permissionGroupCodes not found');
    }
    await this.prisma.$transaction([
      this.prisma.rolePermissionGroup.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermissionGroup.createMany({
        data: groups.map((g) => ({
          roleId: id,
          permissionGroupId: g.id,
        })),
      }),
    ]);
    return this.getRole(id);
  }

  // ── Permissions & groups ───────────────────────────────

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  async createPermission(dto: CreatePermissionDto) {
    return this.prisma.permission.create({
      data: { code: dto.code, description: dto.description },
    });
  }

  async listPermissionGroups() {
    const groups = await this.prisma.permissionGroup.findMany({
      orderBy: { code: 'asc' },
      include: {
        groupPermissions: { include: { permission: true } },
      },
    });
    return groups.map((g) => this.mapGroup(g));
  }

  async getPermissionGroup(id: string) {
    const g = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        groupPermissions: { include: { permission: true } },
      },
    });
    if (!g) throw new NotFoundException('Permission group not found');
    return this.mapGroup(g);
  }

  async createPermissionGroup(dto: CreatePermissionGroupDto) {
    const g = await this.prisma.permissionGroup.create({
      data: { code: dto.code, name: dto.name },
      include: {
        groupPermissions: { include: { permission: true } },
      },
    });
    return this.mapGroup(g);
  }

  async setGroupPermissions(id: string, dto: SetGroupPermissionsDto) {
    const g = await this.prisma.permissionGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Permission group not found');
    const perms = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });
    if (perms.length !== dto.permissionCodes.length) {
      throw new BadRequestException('One or more permissionCodes not found');
    }
    await this.prisma.$transaction([
      this.prisma.groupPermission.deleteMany({
        where: { permissionGroupId: id },
      }),
      this.prisma.groupPermission.createMany({
        data: perms.map((p) => ({
          permissionGroupId: id,
          permissionId: p.id,
        })),
      }),
    ]);
    return this.getPermissionGroup(id);
  }

  // ── helpers ────────────────────────────────────────────

  private async requireUser(id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  private async requireRole(id: string) {
    const r = await this.prisma.role.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Role not found');
    return r;
  }

  private mapUser(u: {
    id: string;
    authSubjectId: string;
    email: string | null;
    displayName: string;
    phone: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userRoles: { role: { id: string; code: string; name: string } }[];
  }) {
    return {
      id: u.id,
      authSubjectId: u.authSubjectId,
      email: u.email,
      displayName: u.displayName,
      phone: u.phone,
      status: u.status,
      roleCodes: u.userRoles.map((ur) => ur.role.code),
      roles: u.userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
      })),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private mapRole(r: {
    id: string;
    code: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    rolePermissionGroups: {
      permissionGroup: { id: string; code: string; name: string };
    }[];
  }) {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      permissionGroupCodes: r.rolePermissionGroups.map(
        (x) => x.permissionGroup.code,
      ),
      permissionGroups: r.rolePermissionGroups.map((x) => ({
        id: x.permissionGroup.id,
        code: x.permissionGroup.code,
        name: x.permissionGroup.name,
      })),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapGroup(g: {
    id: string;
    code: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    groupPermissions: {
      permission: { id: string; code: string; description: string | null };
    }[];
  }) {
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      permissionCodes: g.groupPermissions.map((x) => x.permission.code),
      permissions: g.groupPermissions.map((x) => ({
        id: x.permission.id,
        code: x.permission.code,
        description: x.permission.description,
      })),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}
