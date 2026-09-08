import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

  const reviewer: AuthUser = {
    id: 'reviewer-1',
    email: 'reviewer@dyn.local',
    displayName: 'Reviewer',
    status: 'ACTIVE',
    permissions: ['expense.approve'],
    roleCodes: ['MANAGER'],
  };

  const pendingExpense = {
    id: 'e1',
    orderId: 'o1',
    status: ExpenseStatus.PENDING,
  };

  beforeEach(() => jest.clearAllMocks());

  it('approves when current user is the order reviewer', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(pendingExpense);
    (orders.findById as jest.Mock).mockResolvedValue({
      id: 'o1',
      reviewerUserId: 'reviewer-1',
    });
    (repo.update as jest.Mock).mockResolvedValue({
      ...pendingExpense,
      status: ExpenseStatus.APPROVED,
      amount: 0,
    });

    await service.approve(reviewer, 'e1', {});

    expect(repo.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        status: ExpenseStatus.APPROVED,
        reviewedByUserId: 'reviewer-1',
      }),
    );
  });

  it('rejects reviewers other than the one named on the order', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(pendingExpense);
    (orders.findById as jest.Mock).mockResolvedValue({
      id: 'o1',
      reviewerUserId: 'someone-else',
    });

    await expect(service.approve(reviewer, 'e1', {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('refuses review while the order has no reviewer', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(pendingExpense);
    (orders.findById as jest.Mock).mockResolvedValue({
      id: 'o1',
      reviewerUserId: null,
    });

    await expect(service.reject(reviewer, 'e1', {})).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });
});
