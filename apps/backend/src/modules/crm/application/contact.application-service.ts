import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { CustomerPolicy } from '../domain/policies/customer.policy';
import { LeadPolicy } from '../domain/policies/lead.policy';
import { ContactRepository } from '../infrastructure/prisma/contact.repository';
import { CustomerRepository } from '../infrastructure/prisma/customer.repository';
import { LeadRepository } from '../infrastructure/prisma/lead.repository';
import {
  CreateContactDto,
  ListContactsQueryDto,
  UpdateContactDto,
} from './dto/contact.dto';

function pageOf(q: ListContactsQueryDto) {
  const page = Number(q.page ?? 1) || 1;
  const pageSize = Math.min(Number(q.pageSize ?? 20) || 20, 100);
  return { page, pageSize };
}

@Injectable()
export class ContactApplicationService {
  constructor(
    private readonly repo: ContactRepository,
    private readonly customers: CustomerRepository,
    private readonly leads: LeadRepository,
    private readonly customerPolicy: CustomerPolicy,
    private readonly leadPolicy: LeadPolicy,
  ) {}

  async create(user: AuthUser, dto: CreateContactDto) {
    if (!dto.customerId && !dto.leadId) {
      throw new BadRequestException('customerId or leadId is required');
    }
    if (dto.customerId && dto.leadId) {
      throw new BadRequestException('Provide only one of customerId or leadId');
    }
    await this.assertParentAccess(user, dto.customerId, dto.leadId, 'update');

    if (!user.permissions.includes('contact.create')) {
      throw new ForbiddenException('Missing permission: contact.create');
    }

    const created = await this.repo.create({
      name: dto.name,
      roleTitle: dto.roleTitle,
      phone: dto.phone,
      email: dto.email,
      ...(dto.customerId
        ? { customer: { connect: { id: dto.customerId } } }
        : {}),
      ...(dto.leadId ? { lead: { connect: { id: dto.leadId } } } : {}),
    });
    return created;
  }

  async list(user: AuthUser, query: ListContactsQueryDto) {
    if (!user.permissions.includes('contact.view')) {
      throw new ForbiddenException('Missing permission: contact.view');
    }
    await this.assertParentAccess(user, query.customerId, query.leadId, 'view');
    const { page, pageSize } = pageOf(query);
    const [items, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      customerId: query.customerId,
      leadId: query.leadId,
      search: query.search,
    });
    // Filter by scope when listing without parent filter: only show contacts under accessible parents
    if (!query.customerId && !query.leadId) {
      const scoped = [];
      for (const c of items) {
        try {
          await this.assertParentAccess(user, c.customerId ?? undefined, c.leadId ?? undefined, 'view');
          scoped.push(c);
        } catch {
          /* skip */
        }
      }
      return { items: scoped, total: scoped.length, page, pageSize };
    }
    return { items, total, page, pageSize };
  }

  async getById(user: AuthUser, id: string) {
    if (!user.permissions.includes('contact.view')) {
      throw new ForbiddenException('Missing permission: contact.view');
    }
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contact not found');
    await this.assertParentAccess(
      user,
      record.customerId ?? undefined,
      record.leadId ?? undefined,
      'view',
    );
    return record;
  }

  async update(user: AuthUser, id: string, dto: UpdateContactDto) {
    if (!user.permissions.includes('contact.update')) {
      throw new ForbiddenException('Missing permission: contact.update');
    }
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contact not found');
    await this.assertParentAccess(
      user,
      record.customerId ?? undefined,
      record.leadId ?? undefined,
      'update',
    );
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.roleTitle !== undefined ? { roleTitle: dto.roleTitle } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
    });
  }

  async remove(user: AuthUser, id: string) {
    if (!user.permissions.includes('contact.delete')) {
      throw new ForbiddenException('Missing permission: contact.delete');
    }
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Contact not found');
    await this.assertParentAccess(
      user,
      record.customerId ?? undefined,
      record.leadId ?? undefined,
      'update',
    );
    await this.repo.delete(id);
  }

  private async assertParentAccess(
    user: AuthUser,
    customerId: string | undefined,
    leadId: string | undefined,
    mode: 'view' | 'update',
  ) {
    if (customerId) {
      const c = await this.customers.findById(customerId);
      if (!c) throw new NotFoundException('Customer not found');
      const ok =
        mode === 'view'
          ? this.customerPolicy.canView(user.id, user.permissions, c)
          : this.customerPolicy.canUpdate(user.id, user.permissions, c);
      if (!ok) throw new ForbiddenException('Outside data scope');
      return;
    }
    if (leadId) {
      const l = await this.leads.findById(leadId);
      if (!l) throw new NotFoundException('Lead not found');
      const ok =
        mode === 'view'
          ? this.leadPolicy.canView(user.id, user.permissions, l)
          : this.leadPolicy.canUpdate(user.id, user.permissions, l);
      if (!ok) throw new ForbiddenException('Outside data scope');
    }
  }
}
