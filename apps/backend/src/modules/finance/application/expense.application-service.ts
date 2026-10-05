import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { EntityNameLookup } from '../infrastructure/prisma/entity-name.lookup';
import { ExpenseRepository } from '../infrastructure/prisma/expense.repository';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  ReviewExpenseDto,
} from './dto/expense.dto';

type ExpenseRow = NonNullable<
  Awaited<ReturnType<ExpenseRepository['findById']>>
>;

@Injectable()
export class ExpenseApplicationService {
  constructor(
    private readonly repo: ExpenseRepository,
    private readonly orders: OrderRepository,
    private readonly names: EntityNameLookup,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const order = await this.orders.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    const created = await this.repo.create({
      order: { connect: { id: dto.orderId } },
      title: dto.title,
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency ?? 'VND',
      note: dto.note,
      payeeName: dto.payeeName,
      description: dto.description,
      incurredOn: dto.incurredOn ? new Date(dto.incurredOn) : undefined,
      ctvRelated: dto.ctvRelated ?? false,
      status: ExpenseStatus.PENDING,
      requestedByUserId: user.id,
      requestedAt: new Date(),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return (await this.toDtos([created]))[0];
  }

  async list(user: AuthUser, query: ListExpensesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderId: query.orderId,
    });
    return {
      items: await this.toDtos(rows),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<ExpenseResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Expense not found');
    return (await this.toDtos([record]))[0];
  }

  async approve(
    user: AuthUser,
    id: string,
    dto: ReviewExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.review(user, id, ExpenseStatus.APPROVED, dto.note);
  }

  async reject(
    user: AuthUser,
    id: string,
    dto: ReviewExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.review(user, id, ExpenseStatus.REJECTED, dto.note);
  }

  private async review(
    user: AuthUser,
    id: string,
    status: ExpenseStatus,
    note?: string,
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Expense not found');
    if (record.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Expense is not pending review');
    }

    const updated = await this.repo.update(id, {
      status,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNote: note,
      updatedByUserId: user.id,
    });
    return (await this.toDtos([updated]))[0];
  }

  private async toDtos(rows: ExpenseRow[]): Promise<ExpenseResponseDto[]> {
    if (rows.length === 0) return [];
    const [users, orders] = await Promise.all([
      this.names.usersById(
        rows.flatMap((r) => [r.requestedByUserId, r.reviewedByUserId]),
      ),
      this.names.ordersById(rows.map((r) => r.orderId)),
    ]);
    return rows.map((r) => {
      const order = orders.get(r.orderId);
      return ExpenseResponseDto.from(r, {
        requestedByName: users.get(r.requestedByUserId) ?? null,
        reviewedByName: r.reviewedByUserId
          ? (users.get(r.reviewedByUserId) ?? null)
          : null,
        orderNumber: order?.orderNumber ?? null,
      });
    });
  }
}
