import { BadRequestException } from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { ExpenseApplicationService } from './expense.application-service';
import { ExpenseRepository } from '../infrastructure/prisma/expense.repository';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { AuthUser } from '../../identity/domain/auth-user';

describe('ExpenseApplicationService review', () => {
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as ExpenseRepository;
  const orders = {
    findById: jest.fn(),
  } as unknown as OrderRepository;
  const service = new ExpenseApplicationService(repo, orders);

  const approver: AuthUser = {
    id: 'user-1',
    email: 'approver@dyn.local',
    displayName: 'Approver',
    status: 'ACTIVE',
    permissions: ['expense.approve'],
    roleCodes: ['ACCOUNTING'],
  };

  const pendingExpense = {
    id: 'e1',
    orderId: 'o1',
    status: ExpenseStatus.PENDING,
  };

  beforeEach(() => jest.clearAllMocks());

  it('approves any pending expense when caller has expense.approve', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(pendingExpense);
    (repo.update as jest.Mock).mockResolvedValue({
      ...pendingExpense,
      status: ExpenseStatus.APPROVED,
      amount: 0,
    });

    await service.approve(approver, 'e1', {});

    expect(orders.findById).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        status: ExpenseStatus.APPROVED,
        reviewedByUserId: 'user-1',
      }),
    );
  });

  it('rejects any pending expense when caller has expense.approve', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(pendingExpense);
    (repo.update as jest.Mock).mockResolvedValue({
      ...pendingExpense,
      status: ExpenseStatus.REJECTED,
      amount: 0,
    });

    await service.reject(approver, 'e1', { note: 'no' });

    expect(orders.findById).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        status: ExpenseStatus.REJECTED,
        reviewedByUserId: 'user-1',
        reviewNote: 'no',
      }),
    );
  });

  it('refuses review when expense is not pending', async () => {
    (repo.findById as jest.Mock).mockResolvedValue({
      ...pendingExpense,
      status: ExpenseStatus.APPROVED,
    });

    await expect(service.approve(approver, 'e1', {})).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });
});
