import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { IdentityAdminService } from '../application/identity-admin.service';
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
} from '../application/dto/identity-admin.dto';

@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(AuthGuard, RbacGuard)
export class UsersController {
  constructor(private readonly admin: IdentityAdminService) {}

  @Get()
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'List users (admin)' })
  list(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get(':id')
  @RequirePermission('user.manage')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @Post()
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Create local user (+ optional roles)' })
  create(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Patch(':id')
  @RequirePermission('user.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Soft-delete / deactivate user' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.softDeleteUser(id);
  }

  @Put(':id/roles')
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Replace user roles by role codes' })
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRolesDto,
  ) {
    return this.admin.setUserRoles(id, dto);
  }
}

@ApiTags('roles')
@ApiBearerAuth('bearer')
@Controller('roles')
@UseGuards(AuthGuard, RbacGuard)
export class RolesController {
  constructor(private readonly admin: IdentityAdminService) {}

  @Get()
  @RequirePermission('role.manage')
  list() {
    return this.admin.listRoles();
  }

  @Get(':id')
  @RequirePermission('role.manage')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getRole(id);
  }

  @Post()
  @RequirePermission('role.manage')
  create(@Body() dto: CreateRoleDto) {
    return this.admin.createRole(dto);
  }

  @Patch(':id')
  @RequirePermission('role.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.admin.updateRole(id, dto);
  }

  @Put(':id/permission-groups')
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Replace role → permission groups' })
  setGroups(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionGroupsDto,
  ) {
    return this.admin.setRolePermissionGroups(id, dto);
  }
}

@ApiTags('permissions')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(AuthGuard, RbacGuard)
export class PermissionsController {
  constructor(private readonly admin: IdentityAdminService) {}

  @Get('permissions')
  @RequirePermission('permission.manage')
  listPermissions() {
    return this.admin.listPermissions();
  }

  @Post('permissions')
  @RequirePermission('permission.manage')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.admin.createPermission(dto);
  }

  @Get('permission-groups')
  @RequirePermission('permission.manage')
  listGroups() {
    return this.admin.listPermissionGroups();
  }

  @Get('permission-groups/:id')
  @RequirePermission('permission.manage')
  getGroup(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getPermissionGroup(id);
  }

  @Post('permission-groups')
  @RequirePermission('permission.manage')
  createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.admin.createPermissionGroup(dto);
  }

  @Put('permission-groups/:id/permissions')
  @RequirePermission('permission.manage')
  @ApiOperation({ summary: 'Replace group → permissions' })
  setGroupPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetGroupPermissionsDto,
  ) {
    return this.admin.setGroupPermissions(id, dto);
  }
}
