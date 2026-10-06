import {
  ContractCustomerConflictError,
  OrderRepository,
} from './order.repository';
import { PrismaService } from '../../../../prisma/prisma.service';

describe('OrderRepository.update customer sync', () => {
  const tx = {
    order: {
      count: jest.fn(),
      update: jest.fn(),
    },
    contract: { update: jest.fn() },
  };
  const prisma = {
    order: { update: jest.fn() },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const repo = new OrderRepository(prisma);

  const sync = {
    contractId: 'contract-1',
    customerId: 'cust-2',
    updatedByUserId: 'user-1',
  };

  beforeEach(() => jest.clearAllMocks());

  it('updates the order alone when the customer is not changing', async () => {
    (prisma.order.update as jest.Mock).mockResolvedValue({ id: 'order-1' });
    await repo.update('order-1', { notes: 'kept' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { notes: 'kept' },
    });
  });

  it('writes the order and the contract customer in one transaction', async () => {
    tx.order.count.mockResolvedValue(0);
    tx.order.update.mockResolvedValue({ id: 'order-1' });
    await repo.update('order-1', { customerId: 'cust-2' }, sync);
    expect(tx.contract.update).toHaveBeenCalledWith({
      where: { id: 'contract-1' },
      data: {
        customer: { connect: { id: 'cust-2' } },
        updatedByUserId: 'user-1',
      },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { customerId: 'cust-2' },
    });
  });

  it('aborts when sibling orders belong to a different customer', async () => {
    tx.order.count.mockResolvedValue(1);
    await expect(
      repo.update('order-1', { customerId: 'cust-2' }, sync),
    ).rejects.toBeInstanceOf(ContractCustomerConflictError);
    expect(tx.contract.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
