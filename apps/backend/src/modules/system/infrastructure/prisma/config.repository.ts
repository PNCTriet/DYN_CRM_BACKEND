import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
  }

  findByKey(key: string) {
    return this.prisma.appConfig.findUnique({ where: { key } });
  }

  upsert(key: string, valueJson: Prisma.InputJsonValue) {
    return this.prisma.appConfig.upsert({
      where: { key },
      create: { key, valueJson },
      update: { valueJson },
    });
  }
}
