import { ConflictException } from '@nestjs/common';
import { LeadApplicationService } from './lead.application-service';
import { LeadPolicy } from '../domain/policies/lead.policy';
import { LeadRepository } from '../infrastructure/prisma/lead.repository';
import { AuthUser } from '../../identity/domain/auth-user';

describe('LeadApplicationService.convert', () => {
  const repo = {
    findById: jest.fn(),
    convert: jest.fn(),
  } as unknown as LeadRepository;
  const service = new LeadApplicationService(repo, new LeadPolicy());

  const user: AuthUser = {
    id: 'sales-1',
    email: 's@d.l',
    displayName: 'S',
    status: 'ACTIVE',
    permissions: ['lead.view', 'lead.update', 'lead.convert'],
    roleCodes: ['SALES'],
  };

  it('rejects already converted lead', async () => {
    (repo.findById as jest.Mock).mockResolvedValue({
      id: 'l1',
      ownerId: 'sales-1',
      status: 'CONVERTED',
      convertedCustomerId: 'c1',
    });
    await expect(
      service.convert(user, 'l1', { type: 'COMPANY' }),
    ).rejects.toThrow(ConflictException);
  });
});
