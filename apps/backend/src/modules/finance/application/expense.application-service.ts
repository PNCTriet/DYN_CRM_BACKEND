import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { ExpenseRepository } from '../infrastructure/prisma/expense.repository';
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  ReviewExpenseDto,
} from './dto/expense.dto';

@Injectable()
export class ExpenseApplicationService {
  constructor(
    private readonly repo: ExpenseRepository,
    private readonly orders: OrderRepository,
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
    return ExpenseResponseDto.from(created);
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
      items: rows.map((r) => ExpenseResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<ExpenseResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Expense not found');
    return ExpenseResponseDto.from(record);
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

    // expense.approve alone is not enough: only the reviewer named on the order
    // may settle its expenses.
    const order = await this.orders.findById(record.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!order.reviewerUserId) {
      throw new BadRequestException(
        'Order has no reviewer yet — set reviewerUserId via PATCH /orders/:id first',
      );
    }
    if (order.reviewerUserId !== user.id) {
      throw new ForbiddenException(
        'Only the reviewer assigned to this order can review its expenses',
      );
    }

    const updated = await this.repo.update(id, {
      status,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewNote: note,
      updatedByUserId: user.id,
    });
    return ExpenseResponseDto.from(updated);
  }
}
