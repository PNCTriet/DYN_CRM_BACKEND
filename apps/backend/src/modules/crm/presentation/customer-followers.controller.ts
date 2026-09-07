import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { CustomerPolicy } from '../domain/policies/customer.policy';
import { CustomerRepository } from '../infrastructure/prisma/customer.repository';
import { PrismaService } from '../../../prisma/prisma.service';

class AddFollowerDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}

@Injectable()
export class CustomerFollowersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomerRepository,
    private readonly policy: CustomerPolicy,
  ) {}

  private async requireCustomer(user: AuthUser, customerId: string, write: boolean) {
    const c = await this.customers.findById(customerId);
    if (!c) throw new NotFoundException('Customer not found');
    const ok = write
      ? this.policy.canUpdate(user.id, user.permissions, c)
      : this.policy.canView(user.id, user.permissions, c);
    if (!ok) throw new ForbiddenException('Outside data scope');
    return c;
  }

  async list(user: AuthUser, customerId: string) {
    await this.requireCustomer(user, customerId, false);
    return this.prisma.customerFollower.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(user: AuthUser, customerId: string, followerUserId: string) {
    await this.requireCustomer(user, customerId, true);
    return this.prisma.customerFollower.upsert({
      where: { customerId_userId: { customerId, userId: followerUserId } },
      create: { customerId, userId: followerUserId },
      update: {},
    });
  }

  async remove(user: AuthUser, customerId: string, followerUserId: string) {
    await this.requireCustomer(user, customerId, true);
    await this.prisma.customerFollower.delete({
      where: { customerId_userId: { customerId, userId: followerUserId } },
    });
  }
}

@ApiTags('customers')
@ApiBearerAuth('bearer')
@Controller('customers/:customerId/followers')
@UseGuards(AuthGuard, RbacGuard)
export class CustomerFollowersController {
  constructor(private readonly followers: CustomerFollowersService) {}

  @Get()
  @RequirePermission('customer.view')
  @ApiOperation({ summary: 'List customer followers' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.followers.list(user, customerId);
  }

  @Post()
  @RequirePermission('customer.update')
  @ApiOperation({ summary: 'Add follower' })
  add(
    @CurrentUser() user: AuthUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: AddFollowerDto,
  ) {
    return this.followers.add(user, customerId, dto.userId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('customer.update')
  @ApiOperation({ summary: 'Remove follower' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.followers.remove(user, customerId, userId);
  }
}
