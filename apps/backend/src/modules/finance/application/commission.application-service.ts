import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommissionStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { CommissionRepository } from '../infrastructure/prisma/commission.repository';
import {
  CalculateCommissionDto,
  CommissionResponseDto,
  CreateCommissionDto,
  ListCommissionsQueryDto,
} from './dto/commission.dto';

@Injectable()
export class CommissionApplicationService {
  constructor(
    private readonly repo: CommissionRepository,
    private readonly orders: OrderRepository,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateCommissionDto,
  ): Promise<CommissionResponseDto> {
    const order = await this.orders.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (dto.paymentId) {
      const payment = await this.repo.findPayment(dto.paymentId);
      if (!payment) throw new BadRequestException('Payment not found');
      if (payment.orderId !== dto.orderId) {
        throw new BadRequestException('Payment does not belong to order');
      }
    }
    const rate = new Prisma.Decimal(dto.rate);
    const baseAmount = new Prisma.Decimal(dto.baseAmount);
    const commissionAmount = baseAmount.mul(rate).div(100);
    const created = await this.repo.create({
      order: { connect: { id: dto.orderId } },
      ...(dto.paymentId
        ? { payment: { connect: { id: dto.paymentId } } }
        : {}),
      ...(dto.collaboratorId
        ? { collaborator: { connect: { id: dto.collaboratorId } } }
        : {}),
      beneficiaryUserId: dto.beneficiaryUserId,
      rate,
      baseAmount,
      commissionAmount,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      status: CommissionStatus.CALCULATED,
      calculatedAt: new Date(),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return CommissionResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListCommissionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderId: query.orderId,
    });
    return {
      items: rows.map((r) => CommissionResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<CommissionResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Commission not found');
    return CommissionResponseDto.from(record);
  }

  async calculate(
    user: AuthUser,
    id: string,
    dto: CalculateCommissionDto,
  ): Promise<CommissionResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Commission not found');
    const rate = new Prisma.Decimal(dto.rate);
    const baseAmount = new Prisma.Decimal(dto.baseAmount);
    const commissionAmount = baseAmount.mul(rate).div(100);
    const updated = await this.repo.update(id, {
      rate,
      baseAmount,
      commissionAmount,
      status: CommissionStatus.CALCULATED,
      calculatedAt: new Date(),
      updatedByUserId: user.id,
    });
    return CommissionResponseDto.from(updated);
  }

  async approve(user: AuthUser, id: string): Promise<CommissionResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Commission not found');
    if (
      record.status !== CommissionStatus.CALCULATED &&
      record.status !== CommissionStatus.PENDING
    ) {
      throw new BadRequestException(
        'Commission must be CALCULATED or PENDING to approve',
      );
    }
    const updated = await this.repo.update(id, {
      status: CommissionStatus.APPROVED,
      updatedByUserId: user.id,
    });
    return CommissionResponseDto.from(updated);
  }

  async pay(user: AuthUser, id: string): Promise<CommissionResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Commission not found');
    if (record.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException('Commission must be APPROVED to pay');
    }
    const updated = await this.repo.update(id, {
      status: CommissionStatus.PAID,
      updatedByUserId: user.id,
    });
    return CommissionResponseDto.from(updated);
  }
}
