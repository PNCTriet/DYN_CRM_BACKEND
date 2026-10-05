import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentVerificationStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { EntityNameLookup } from '../infrastructure/prisma/entity-name.lookup';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { PaymentRepository } from '../infrastructure/prisma/payment.repository';
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  PaymentResponseDto,
} from './dto/payment.dto';

type PaymentRow = NonNullable<
  Awaited<ReturnType<PaymentRepository['findById']>>
>;

@Injectable()
export class PaymentApplicationService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly names: EntityNameLookup,
  ) {}

  async create(
    user: AuthUser,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const order = await this.orders.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (dto.scheduleLineId) {
      const line = await this.repo.findScheduleLine(dto.scheduleLineId);
      if (!line) throw new BadRequestException('Schedule line not found');
    }
    const created = await this.repo.create({
      order: { connect: { id: dto.orderId } },
      amount: new Prisma.Decimal(dto.amount),
      method: dto.method,
      recordedAt: new Date(),
      verificationStatus: PaymentVerificationStatus.RECORDED,
      ...(dto.scheduleLineId
        ? { scheduleLine: { connect: { id: dto.scheduleLineId } } }
        : {}),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return (await this.toDtos([created]))[0];
  }

  async list(user: AuthUser, query: ListPaymentsQueryDto) {
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

  async getById(user: AuthUser, id: string): Promise<PaymentResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Payment not found');
    return (await this.toDtos([record]))[0];
  }

  async verify(user: AuthUser, id: string): Promise<PaymentResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Payment not found');
    if (record.verificationStatus === PaymentVerificationStatus.VOIDED) {
      throw new BadRequestException('Cannot verify a voided payment');
    }
    const updated = await this.repo.update(id, {
      verificationStatus: PaymentVerificationStatus.VERIFIED,
      updatedByUserId: user.id,
    });
    return (await this.toDtos([updated]))[0];
  }

  async void(user: AuthUser, id: string): Promise<PaymentResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Payment not found');
    const updated = await this.repo.update(id, {
      verificationStatus: PaymentVerificationStatus.VOIDED,
      updatedByUserId: user.id,
    });
    return (await this.toDtos([updated]))[0];
  }

  private async toDtos(rows: PaymentRow[]): Promise<PaymentResponseDto[]> {
    if (rows.length === 0) return [];
    const orders = await this.names.ordersById(rows.map((r) => r.orderId));
    const customers = await this.names.customersById(
      [...orders.values()].map((o) => o.customerId),
    );
    return rows.map((r) => {
      const order = orders.get(r.orderId);
      return PaymentResponseDto.from(r, {
        orderNumber: order?.orderNumber ?? null,
        customerId: order?.customerId ?? null,
        customerName: order
          ? (customers.get(order.customerId) ?? null)
          : null,
      });
    });
  }
}
