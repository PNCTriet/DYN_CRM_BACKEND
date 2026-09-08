import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerApplicationService } from './customer.application-service';
import { CustomerPolicy } from '../domain/policies/customer.policy';
import { CustomerRepository } from '../infrastructure/prisma/customer.repository';
import { AuthUser } from '../../identity/domain/auth-user';

describe('CustomerApplicationService', () => {
  const repo = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as CustomerRepository;
  const policy = new CustomerPolicy();
  const service = new CustomerApplicationService(repo, policy);

  const salesUser: AuthUser = {
    id: 'sales-1',
    email: 'sales@dyn.local',
    displayName: 'Sales',
    status: 'ACTIVE',
    permissions: ['customer.view', 'customer.create', 'customer.update', 'customer.delete'],
    roleCodes: ['SALES'],
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates customer owned by current user', async () => {
    (repo.create as jest.Mock).mockResolvedValue({
      id: 'c1',
      type: 'COMPANY',
      ownerId: 'sales-1',
      industryOrField: null,
      legalName: 'Acme',
      displayName: 'Acme',
      phone: null,
      email: null,
      taxId: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.create(salesUser, {
      type: 'COMPANY',
      legalName: 'Acme',
      displayName: 'Acme',
    });
    expect(result.legalName).toBe('Acme');
    expect(result.status).toBe('active');
    expect(repo.create).toHaveBeenCalled();
  });

  it('persists custom status key on update', async () => {
    (repo.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      ownerId: 'sales-1',
    });
    (repo.update as jest.Mock).mockResolvedValue({
      id: 'c1',
      type: 'COMPANY',
      ownerId: 'sales-1',
      industryOrField: null,
      legalName: 'Acme',
      displayName: 'Acme',
      phone: null,
      email: null,
      taxId: null,
      status: 'vip-lead',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update(salesUser, 'c1', {
      status: 'vip-lead',
    });

    expect(repo.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ status: 'vip-lead' }),
    );
    expect(result.status).toBe('vip-lead');
  });

  it('denies getById outside OWN scope', async () => {
    (repo.findById as jest.Mock).mockResolvedValue({
      id: 'c1',
      ownerId: 'other',
    });
    await expect(service.getById(salesUser, 'c1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('404 when customer missing', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(service.getById(salesUser, 'c1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('denies assign without customer.assign', async () => {
    await expect(
      service.create(salesUser, {
        type: 'INDIVIDUAL',
        legalName: 'A',
        displayName: 'A',
        ownerId: 'someone-else',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
