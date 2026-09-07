import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../identity/domain/auth-user';
import { StoragePort } from '../../../common/storage/storage.port';
import {
  DocumentRepository,
  mapDocument,
} from '../infrastructure/prisma/document.repository';
import {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  UploadDocumentFieldsDto,
} from './dto/document.dto';

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20MB
const DEFAULT_MIME_ALLOW = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@Injectable()
export class DocumentApplicationService {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly storage: StoragePort,
    private readonly config: ConfigService,
  ) {}

  /** Legacy: register metadata only (storageKey already known). */
  async create(user: AuthUser, dto: CreateDocumentDto) {
    if (!dto.contractId && !dto.orderId) {
      throw new BadRequestException(
        'At least one of contractId or orderId is required',
      );
    }
    if (!dto.storageKey || !dto.fileName) {
      throw new BadRequestException('storageKey and fileName are required');
    }
    const created = await this.repo.create({
      storageKey: dto.storageKey,
      fileName: dto.fileName,
      fileType: dto.fileType,
      mimeType: dto.mimeType,
      fileSize:
        dto.fileSize !== undefined ? BigInt(dto.fileSize) : undefined,
      uploadedByUserId: user.id,
      ...(dto.contractId
        ? { contract: { connect: { id: dto.contractId } } }
        : {}),
      ...(dto.orderId ? { order: { connect: { id: dto.orderId } } } : {}),
    });
    return mapDocument(created);
  }

  /**
   * Upload binary to Supabase Storage + persist document_metadata.
   */
  async upload(
    user: AuthUser,
    file: Express.Multer.File | undefined,
    fields: UploadDocumentFieldsDto,
  ) {
    if (!file) {
      throw new BadRequestException('file is required (multipart field "file")');
    }
    if (!fields.contractId && !fields.orderId) {
      throw new BadRequestException(
        'At least one of contractId or orderId is required',
      );
    }

    const maxBytes = Number(
      this.config.get<string>('STORAGE_MAX_BYTES') ?? DEFAULT_MAX_BYTES,
    );
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File too large (max ${maxBytes} bytes)`,
      );
    }

    const allowList = (
      this.config.get<string>('STORAGE_ALLOWED_MIME') ??
      DEFAULT_MIME_ALLOW.join(',')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const mime = file.mimetype || 'application/octet-stream';
    if (allowList.length && !allowList.includes(mime)) {
      throw new BadRequestException(`MIME type not allowed: ${mime}`);
    }

    const safeName = file.originalname.replace(/[^\w.\-()+ ]+/g, '_');
    const scope = fields.contractId
      ? `contracts/${fields.contractId}`
      : `orders/${fields.orderId}`;
    const storageKey = `${scope}/${randomUUID()}-${safeName}`;

    await this.storage.upload({
      storageKey,
      body: file.buffer,
      contentType: mime,
    });

    const ext = safeName.includes('.')
      ? safeName.split('.').pop()!.toLowerCase()
      : null;

    const created = await this.repo.create({
      storageKey,
      fileName: file.originalname,
      fileType: fields.fileType ?? ext,
      mimeType: mime,
      fileSize: BigInt(file.size),
      uploadedByUserId: user.id,
      ...(fields.contractId
        ? { contract: { connect: { id: fields.contractId } } }
        : {}),
      ...(fields.orderId
        ? { order: { connect: { id: fields.orderId } } }
        : {}),
    });

    return {
      ...mapDocument(created),
      bucket: this.storage.getBucket(),
    };
  }

  async list(query: ListDocumentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      contractId: query.contractId,
      orderId: query.orderId,
    });
    return {
      items: rows.map(mapDocument),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Document not found');
    return mapDocument(row);
  }

  async getDownloadUrl(id: string, expiresInSeconds?: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Document not found');
    const expires =
      expiresInSeconds ??
      Number(this.config.get<string>('STORAGE_SIGNED_URL_TTL') ?? 3600);
    const url = await this.storage.createSignedDownloadUrl(
      row.storageKey,
      expires,
    );
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      expiresIn: expires,
      downloadUrl: url,
    };
  }

  async softDelete(id: string, removeFromStorage = true) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Document not found');
    await this.repo.softDelete(id);
    if (removeFromStorage) {
      try {
        await this.storage.remove(row.storageKey);
      } catch {
        // metadata already soft-deleted; storage cleanup can be retried later
      }
    }
  }
}
