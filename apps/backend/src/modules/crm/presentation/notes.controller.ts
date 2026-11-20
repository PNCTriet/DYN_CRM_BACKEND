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
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { NotesApplicationService } from '../application/notes.application-service';

class CreateNoteDto {
  @ApiProperty({ example: 'ORDER', enum: ['CUSTOMER', 'LEAD', 'ORDER'] })
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'ORDER notes only. Active user ids; duplicates are stored once.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mentionedUserIds?: string[];
}

class UpdateNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  content!: string;
}

class ListNotesQueryDto {
  @ApiProperty({ example: 'ORDER' })
  @IsString()
  subjectType!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;
}

@ApiTags('notes')
@ApiBearerAuth('bearer')
@Controller('notes')
@UseGuards(AuthGuard, RbacGuard)
export class NotesController {
  constructor(private readonly notes: NotesApplicationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a note. CUSTOMER|LEAD requires customer.update. ORDER requires order.update inside OrderPolicy scope.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNoteDto) {
    return this.notes.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List notes, newest first. CUSTOMER|LEAD requires customer.view. ORDER requires order.view inside OrderPolicy scope.',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListNotesQueryDto) {
    return this.notes.list(user, query);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update note content. CUSTOMER|LEAD requires customer.update. ORDER allows the author, or order.update inside scope.',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a note. CUSTOMER|LEAD requires customer.update. ORDER allows the author, or order.update inside scope.',
  })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notes.remove(user, id);
  }
}
