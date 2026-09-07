import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { PrismaService } from '../../../prisma/prisma.service';

class CreateActivityDto {
  @ApiProperty({ example: 'CUSTOMER' })
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: 'CALL' })
  @IsString()
  @MaxLength(50)
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ISO datetime; default now' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

class ListActivitiesQueryDto {
  @ApiProperty()
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        type: dto.type,
        payload:
          dto.payload === undefined
            ? undefined
            : (dto.payload as Prisma.InputJsonValue),
        actorUserId: user.id,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
    });
  }

  list(query: ListActivitiesQueryDto) {
    return this.prisma.activity.findMany({
      where: { subjectType: query.subjectType, subjectId: query.subjectId },
      orderBy: { occurredAt: 'desc' },
    });
  }
}

@ApiTags('activities')
@ApiBearerAuth('bearer')
@Controller('activities')
@UseGuards(AuthGuard, RbacGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post()
  @RequirePermission('customer.update')
  @ApiOperation({ summary: 'Record activity on subject' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateActivityDto) {
    return this.activities.create(user, dto);
  }

  @Get()
  @RequirePermission('customer.view')
  @ApiOperation({ summary: 'List activities by subject' })
  list(@Query() query: ListActivitiesQueryDto) {
    return this.activities.list(query);
  }
}
