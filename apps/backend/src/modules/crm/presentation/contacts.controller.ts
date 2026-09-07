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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { ContactApplicationService } from '../application/contact.application-service';
import {
  CreateContactDto,
  ListContactsQueryDto,
  UpdateContactDto,
} from '../application/dto/contact.dto';

@ApiTags('contacts')
@ApiBearerAuth('bearer')
@Controller('contacts')
@UseGuards(AuthGuard, RbacGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactApplicationService) {}

  @Post()
  @RequirePermission('contact.create')
  @ApiOperation({ summary: 'Create contact on customer or lead' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContactDto) {
    return this.contacts.create(user, dto);
  }

  @Get()
  @RequirePermission('contact.view')
  @ApiOperation({ summary: 'List contacts' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListContactsQueryDto) {
    return this.contacts.list(user, query);
  }

  @Get(':id')
  @RequirePermission('contact.view')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('contact.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('contact.delete')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.remove(user, id);
  }
}
