import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { PrismaService } from '../../../prisma/prisma.service';

class CreateNoteDto {
  @ApiProperty({ example: 'CUSTOMER' })
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content!: string;
}

class UpdateNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content!: string;
}

class ListNotesQueryDto {
  @ApiProperty()
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;
}

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        content: dto.content,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
    });
  }

  list(query: ListNotesQueryDto) {
    return this.prisma.note.findMany({
      where: { subjectType: query.subjectType, subjectId: query.subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateNoteDto) {
    const note = await this.prisma.note.findFirst({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    return this.prisma.note.update({
      where: { id },
      data: { content: dto.content, updatedByUserId: user.id },
    });
  }

  async remove(id: string) {
    await this.prisma.note.delete({ where: { id } });
  }
}

@ApiTags('notes')
@ApiBearerAuth('bearer')
@Controller('notes')
@UseGuards(AuthGuard, RbacGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  @RequirePermission('customer.update')
  @ApiOperation({ summary: 'Create note on subject (CUSTOMER|LEAD|…)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNoteDto) {
    return this.notes.create(user, dto);
  }

  @Get()
  @RequirePermission('customer.view')
  @ApiOperation({ summary: 'List notes by subjectType + subjectId' })
  list(@Query() query: ListNotesQueryDto) {
    return this.notes.list(query);
  }

  @Patch(':id')
  @RequirePermission('customer.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('customer.update')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notes.remove(id);
  }
}
