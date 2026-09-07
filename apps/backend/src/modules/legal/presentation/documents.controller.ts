import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { DocumentApplicationService } from '../application/document.application-service';
import {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  UploadDocumentFieldsDto,
} from '../application/dto/document.dto';

@ApiTags('documents')
@ApiBearerAuth('bearer')
@Controller('documents')
@UseGuards(AuthGuard, RbacGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentApplicationService) {}

  @Post('upload')
  @RequirePermission('document.upload')
  @ApiOperation({
    summary: 'Upload file to Supabase Storage + save document_metadata',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        contractId: { type: 'string', format: 'uuid' },
        orderId: { type: 'string', format: 'uuid' },
        fileType: { type: 'string', example: 'contract' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() fields: UploadDocumentFieldsDto,
  ) {
    return this.documents.upload(user, file, fields);
  }

  @Post()
  @RequirePermission('document.upload')
  @ApiOperation({
    summary: 'Register metadata only (when file already in Storage)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Get()
  @RequirePermission('document.upload')
  @ApiOperation({ summary: 'List document metadata' })
  list(@Query() query: ListDocumentsQueryDto) {
    return this.documents.list(query);
  }

  @Get(':id')
  @RequirePermission('document.upload')
  @ApiOperation({ summary: 'Get document metadata by id' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.getById(id);
  }

  @Get(':id/download-url')
  @RequirePermission('document.upload')
  @ApiOperation({ summary: 'Create signed download URL (Supabase Storage)' })
  downloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.getDownloadUrl(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('document.upload')
  @ApiOperation({ summary: 'Soft-delete metadata (+ remove from Storage)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.softDelete(id, true);
  }
}
