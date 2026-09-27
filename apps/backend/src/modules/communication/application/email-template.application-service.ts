import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { EmailTemplateRepository } from '../infrastructure/prisma/email-template.repository';
import {
  CreateEmailTemplateDto,
  EmailTemplateResponseDto,
  ListEmailTemplatesQueryDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';

@Injectable()
export class EmailTemplateApplicationService {
  constructor(private readonly repo: EmailTemplateRepository) {}

  async create(user: AuthUser, dto: CreateEmailTemplateDto) {
    const created = await this.repo.create({
      key: dto.key,
      name: dto.name,
      subject: dto.subject,
      htmlBody: dto.htmlBody,
      textBody: dto.textBody,
      description: dto.description,
      isActive: dto.isActive ?? true,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return EmailTemplateResponseDto.from(created);
  }

  async list(query: ListEmailTemplatesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      activeOnly: query.activeOnly,
    });
    return {
      items: rows.map((r) => EmailTemplateResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Email template not found');
    return EmailTemplateResponseDto.from(record);
  }

  async update(user: AuthUser, id: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Email template not found');
    const updated = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.htmlBody !== undefined ? { htmlBody: dto.htmlBody } : {}),
      ...(dto.textBody !== undefined ? { textBody: dto.textBody } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      updatedByUserId: user.id,
    });
    return EmailTemplateResponseDto.from(updated);
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Email template not found');
    await this.repo.delete(id);
    return { deleted: true };
  }
}
