import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { ConfigRepository } from '../infrastructure/prisma/config.repository';
import {
  ConfigResponseDto,
  ListConfigQueryDto,
  UpdateConfigDto,
} from './dto/config.dto';

@Injectable()
export class ConfigApplicationService {
  constructor(private readonly repo: ConfigRepository) {}

  async list(user: AuthUser, query: ListConfigQueryDto) {
    if (query.key) {
      const row = await this.repo.findByKey(query.key);
      if (!row) throw new NotFoundException('Config key not found');
      return { items: [ConfigResponseDto.from(row)] };
    }
    const rows = await this.repo.findAll();
    return { items: rows.map((r) => ConfigResponseDto.from(r)) };
  }

  async getByKey(user: AuthUser, key: string): Promise<ConfigResponseDto> {
    const row = await this.repo.findByKey(key);
    if (!row) throw new NotFoundException('Config key not found');
    return ConfigResponseDto.from(row);
  }

  async update(
    user: AuthUser,
    key: string,
    dto: UpdateConfigDto,
  ): Promise<ConfigResponseDto> {
    const updated = await this.repo.upsert(
      key,
      dto.valueJson as Prisma.InputJsonValue,
    );
    return ConfigResponseDto.from(updated);
  }
}
