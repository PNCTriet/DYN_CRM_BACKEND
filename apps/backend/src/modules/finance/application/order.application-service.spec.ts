import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerPolicy } from '../../crm/domain/policies/customer.policy';
import { AuthUser } from '../../identity/domain/auth-user';
import { ServicePolicy } from '../../service/domain/policies/service.policy';
import { OrderPolicy } from '../domain/policies/order.policy';
import { EntityNameLookup } from '../infrastructure/prisma/entity-name.lookup';
import { ExpenseRepository } from '../infrastructure/prisma/expense.repository';
import {
  ContractCustomerConflictError,
  OrderRepository,
} from '../infrastructure/prisma/order.repository';
import { PaymentRepository } from '../infrastructure/prisma/payment.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderApplicationService } from './order.application-service';
import { UpdateOrderDto } from './dto/update-order.dto';

function money(value: string) {
  return new Prisma.Decimal(value);
}

function orderRow() {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    contractId: 'contract-1',
    customerId: 'cust-1',
    serviceId: 'svc-1',
    stage: 'new',
    channel: 'direct',
    collaboratorId: null,
    value: money('1000'),
    collaboratorPrice: null,
    commissionPercent: null,
    totalNet: money('1000'),
    vatRate: money('10'),
    totalGross: money('1100'),
    currency: 'VND',
    assignedUserId: 'user-own',
    submitterUserId: 'user-sub',
    reviewerUserId: null,
    approvalStatus: 'none',
    notes: 'keep-me' as string | null,
    deadline: null as Date | null,
    zaloGroupLink: null as string | null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    service: { id: 'svc-1', name: 'Service svc-1' },
    collaborator: null,
  };
}

const ownUser: AuthUser = {
  id: 'user-own',
  email: 'own@dyn.local',
  displayName: 'Owner',
  status: 'ACTIVE',
  permissions: ['order.view', 'order.update', 'customer.view', 'service.view'],
  roleCodes: ['SALES'],
};

const allUser: AuthUser = {
  id: 'user-all',
  email: 'all@dyn.local',
  displayName: 'Admin',
  status: 'ACTIVE',
  permissions: [
    'order.view',
    'order.update',
    'order.assign',
    'customer.view',
    'customer.assign',
    'customer.delete',
    'customer.export',
    'service.view',
    'service.archive',
  ],
  roleCodes: ['ADMIN'],
};

describe('OrderApplicationService update', () => {
  let stored = orderRow();
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
    findCustomer: jest.fn(),
    findService: jest.fn(),
    findActiveUser: jest.fn(),
    findContract: jest.fn(),
  } as unknown as OrderRepository;
  const names = {
    customersById: jest.fn(),
    usersById: jest.fn(),
  } as unknown as EntityNameLookup;
  const service = new OrderApplicationService(
    repo,
    new OrderPolicy(),
    names,
    {} as PaymentRepository,
    {} as ExpenseRepository,
    {} as PrismaService,
    new CustomerPolicy(),
    new ServicePolicy(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    stored = orderRow();
    (repo.findById as jest.Mock).mockImplementation(async () => stored);
    (repo.update as jest.Mock).mockImplementation(
      async (_id: string, data: Record<string, unknown>) => {
        if (typeof data.customerId === 'string') stored.customerId = data.customerId;
        const connect = data.service as { connect?: { id: string } } | undefined;
        if (connect?.connect?.id) {
          stored.serviceId = connect.connect.id;
          stored.service = { id: stored.serviceId, name: `Service ${stored.serviceId}` };
        }
        if (typeof data.submitterUserId === 'string') {
          stored.submitterUserId = data.submitterUserId;
        }
        if (typeof data.assignedUserId === 'string') {
          stored.assignedUserId = data.assignedUserId;
        }
        if ('deadline' in data) stored.deadline = data.deadline as Date | null;
        if ('zaloGroupLink' in data) {
          stored.zaloGroupLink = data.zaloGroupLink as string | null;
        }
        if ('notes' in data) stored.notes = data.notes as string | null;
        if ('value' in data) stored.value = data.value as Prisma.Decimal;
        return stored;
      },
    );
    (names.customersById as jest.Mock).mockImplementation(async (ids: string[]) => {
      return new Map(ids.filter(Boolean).map((id) => [id, `Customer ${id}`]));
    });
    (names.usersById as jest.Mock).mockImplementation(
      async (ids: Array<string | null | undefined>) => {
        return new Map(
          ids.filter((id): id is string => !!id).map((id) => [id, `User ${id}`]),
        );
      },
    );
    (repo.findCustomer as jest.Mock).mockImplementation(async (id: string) => ({
      id,
      ownerId: 'user-all',
    }));
    (repo.findService as jest.Mock).mockImplementation(async (id: string) => ({
      id,
      createdByUserId: 'user-all',
    }));
    (repo.findActiveUser as jest.Mock).mockImplementation(async (id: string) => ({
      id,
    }));
  });

  function patch(user: AuthUser, dto: UpdateOrderDto) {
    return service.update(user, 'order-1', dto);
  }

  function updateData() {
    const calls = (repo.update as jest.Mock).mock.calls;
    return calls[calls.length - 1][1] as Record<string, unknown>;
  }

  it('persists customerId, hydrates customerName, and syncs the contract', async () => {
    const dto = await patch(allUser, { customerId: 'cust-2' });
    expect(dto.customerId).toBe('cust-2');
    expect(dto.customerName).toBe('Customer cust-2');
    expect(repo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({ customerId: 'cust-2' }),
      {
        contractId: 'contract-1',
        customerId: 'cust-2',
        updatedByUserId: 'user-all',
      },
    );
    expect(updateData()).not.toHaveProperty('value');
    expect(updateData()).not.toHaveProperty('deadline');
  });

  it('returns 409 CONTRACT_CUSTOMER_CONFLICT when sibling orders disagree', async () => {
    (repo.update as jest.Mock).mockRejectedValue(new ContractCustomerConflictError());
    try {
      await patch(allUser, { customerId: 'cust-2' });
      throw new Error('expected conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: 'CONTRACT_CUSTOMER_CONFLICT' }),
      );
    }
  });

  it('does not touch the contract when customerId is unchanged', async () => {
    await patch(allUser, { customerId: 'cust-1', notes: 'n' });
    expect(repo.findCustomer).not.toHaveBeenCalled();
    expect((repo.update as jest.Mock).mock.calls[0][2]).toBeUndefined();
    expect(updateData()).not.toHaveProperty('customerId');
  });

  it('rejects a missing customer with 400 and a hidden customer with 404', async () => {
    (repo.findCustomer as jest.Mock).mockResolvedValueOnce(null);
    await expect(patch(allUser, { customerId: 'missing' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    (repo.findCustomer as jest.Mock).mockResolvedValueOnce({
      id: 'cust-2',
      ownerId: 'someone-else',
    });
    await expect(patch(ownUser, { customerId: 'cust-2' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('persists serviceId and serviceName without rewriting value or deadline', async () => {
    const dto = await patch(allUser, { serviceId: 'svc-2' });
    expect(dto.serviceId).toBe('svc-2');
    expect(dto.serviceName).toBe('Service svc-2');
    expect(dto.value).toBe(stored.value.toString());
    expect(updateData().service).toEqual({ connect: { id: 'svc-2' } });
    expect(updateData()).not.toHaveProperty('value');
    expect(updateData()).not.toHaveProperty('deadline');
  });

  it('rejects a missing service with 400 and a hidden service with 404', async () => {
    (repo.findService as jest.Mock).mockResolvedValueOnce(null);
    await expect(patch(allUser, { serviceId: 'missing' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    (repo.findService as jest.Mock).mockResolvedValueOnce({
      id: 'svc-2',
      createdByUserId: 'someone-else',
    });
    await expect(patch(ownUser, { serviceId: 'svc-2' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('changes submitterUserId only for ALL scope and echoes the name', async () => {
    try {
      await patch(ownUser, { submitterUserId: 'user-new' });
      throw new Error('expected immutable');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ code: 'SUBMITTER_IMMUTABLE' }),
      );
    }
    expect(repo.update).not.toHaveBeenCalled();

    const dto = await patch(allUser, { submitterUserId: 'user-new' });
    expect(dto.submitterUserId).toBe('user-new');
    expect(dto.submitterName).toBe('User user-new');
  });

  it('rejects an inactive submitter', async () => {
    (repo.findActiveUser as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      patch(allUser, { submitterUserId: 'user-gone' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('stores a deadline calendar day and clears it with null', async () => {
    const saved = await patch(allUser, { deadline: '2026-10-20' });
    expect(saved.deadline).toBe('2026-10-20');
    expect(updateData().deadline).toEqual(new Date('2026-10-20T00:00:00.000Z'));
    expect(updateData()).not.toHaveProperty('notes');

    const cleared = await patch(allUser, { deadline: null });
    expect(cleared.deadline).toBeNull();
    expect(updateData().deadline).toBeNull();
  });

  it('rejects an impossible deadline before writing', async () => {
    await expect(patch(allUser, { deadline: '2026-02-31' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('stores zaloGroupUrl on zaloGroupLink and clears it with null', async () => {
    const saved = await patch(allUser, {
      zaloGroupUrl: 'https://zalo.me/g/example',
    });
    expect(saved.zaloGroupUrl).toBe('https://zalo.me/g/example');
    expect(saved.zaloGroupLink).toBe('https://zalo.me/g/example');

    const cleared = await patch(allUser, { zaloGroupUrl: null });
    expect(cleared.zaloGroupUrl).toBeNull();
    expect(cleared.zaloGroupLink).toBeNull();
    expect(stored.notes).toBe('keep-me');
  });

  it('does not clear fields that were omitted', async () => {
    stored.deadline = new Date('2026-10-20T00:00:00.000Z');
    stored.zaloGroupLink = 'https://zalo.me/g/example';
    const dto = await patch(ownUser, { notes: 'only notes' });
    const data = updateData();
    expect(data).not.toHaveProperty('customerId');
    expect(data).not.toHaveProperty('service');
    expect(data).not.toHaveProperty('submitterUserId');
    expect(data).not.toHaveProperty('assignedUserId');
    expect(data).not.toHaveProperty('deadline');
    expect(data).not.toHaveProperty('zaloGroupLink');
    expect(data).not.toHaveProperty('value');
    expect(dto.notes).toBe('only notes');
    expect(dto.customerId).toBe('cust-1');
    expect(dto.deadline).toBe('2026-10-20');
    expect(dto.zaloGroupUrl).toBe('https://zalo.me/g/example');
  });

  it('returns 403 outside order scope, matching GET', async () => {
    stored.assignedUserId = 'someone-else';
    await expect(patch(ownUser, { notes: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getById(ownUser, 'order-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    (repo.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(patch(allUser, { notes: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('changes assignedUserId only with order.assign and keeps POST assign semantics', async () => {
    await expect(
      patch(ownUser, { assignedUserId: 'user-new' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();

    await patch(ownUser, { assignedUserId: 'user-own', notes: 'same assignee' });
    expect(updateData()).not.toHaveProperty('assignedUserId');

    const dto = await patch(allUser, { assignedUserId: 'user-new' });
    expect(dto.assignedUserId).toBe('user-new');
    expect(dto.assignedUserName).toBe('User user-new');
  });

  it('GET echoes deadline and zaloGroupUrl', async () => {
    stored.deadline = new Date('2026-10-20T00:00:00.000Z');
    stored.zaloGroupLink = 'https://zalo.me/g/example';
    const dto = await service.getById(ownUser, 'order-1');
    expect(dto.deadline).toBe('2026-10-20');
    expect(dto.zaloGroupUrl).toBe('https://zalo.me/g/example');
    expect(dto.customerName).toBe('Customer cust-1');
    expect(dto.serviceName).toBe('Service svc-1');
    expect(dto.submitterName).toBe('User user-sub');
  });
});
