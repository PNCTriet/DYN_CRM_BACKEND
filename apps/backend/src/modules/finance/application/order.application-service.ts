import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { OrderPolicy } from '../domain/policies/order.policy';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import {
  ApproveOrderDto,
  AssignOrderDto,
  ChangeOrderStageDto,
} from './dto/order-commands.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  CreatePaymentScheduleDto,
  PaymentScheduleResponseDto,
} from './dto/payment-schedule.dto';

@Injectable()
export class OrderApplicationService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly policy: OrderPolicy,
  ) {}

  async create(user: AuthUser, dto: CreateOrderDto): Promise<OrderResponseDto> {
    await this.assertRefs(dto.contractId, dto.customerId, dto.serviceId);
    const created = await this.repo.create({
      orderNumber: dto.orderNumber,
      contract: { connect: { id: dto.contractId } },
      customerId: dto.customerId,
      service: { connect: { id: dto.serviceId } },
      value: new Prisma.Decimal(dto.value),
      totalNet: new Prisma.Decimal(dto.totalNet),
      totalGross: new Prisma.Decimal(dto.totalGross),
      vatRate: new Prisma.Decimal(dto.vatRate ?? 10),
      currency: dto.currency ?? 'VND',
      stage: dto.stage ?? 'new',
      assignedUserId: dto.assignedUserId,
      submitterUserId: dto.submitterUserId ?? user.id,
      notes: dto.notes,
      ...(dto.collaboratorId
        ? { collaborator: { connect: { id: dto.collaboratorId } } }
        : {}),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return OrderResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter = this.policy.listFilter(user.id, user.permissions);
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      assignedUserId: filter.ownerId,
      search: query.search,
      stage: query.stage,
      customerId: query.customerId,
      contractId: query.contractId,
    });
    return {
      items: rows.map((r) => OrderResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<OrderResponseDto> {
    const record = await this.requireScoped(user, id, 'view');
    return OrderResponseDto.from(record);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    await this.requireScoped(user, id, 'update');
    const updated = await this.repo.update(id, {
      ...(dto.collaboratorId !== undefined
        ? dto.collaboratorId === null
          ? { collaborator: { disconnect: true } }
          : { collaborator: { connect: { id: dto.collaboratorId } } }
        : {}),
      ...(dto.value !== undefined
        ? { value: new Prisma.Decimal(dto.value) }
        : {}),
      ...(dto.totalNet !== undefined
        ? { totalNet: new Prisma.Decimal(dto.totalNet) }
        : {}),
      ...(dto.totalGross !== undefined
        ? { totalGross: new Prisma.Decimal(dto.totalGross) }
        : {}),
      ...(dto.vatRate !== undefined
        ? { vatRate: new Prisma.Decimal(dto.vatRate) }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
      ...(dto.reviewerUserId !== undefined
        ? { reviewerUserId: dto.reviewerUserId }
        : {}),
      updatedByUserId: user.id,
    });
    return OrderResponseDto.from(updated);
  }

  async assign(
    user: AuthUser,
    id: string,
    dto: AssignOrderDto,
  ): Promise<OrderResponseDto> {
    await this.requireScoped(user, id, 'update');
    const updated = await this.repo.update(id, {
      assignedUserId: dto.assignedUserId,
      updatedByUserId: user.id,
    });
    return OrderResponseDto.from(updated);
  }

  async changeStage(
    user: AuthUser,
    id: string,
    dto: ChangeOrderStageDto,
  ): Promise<OrderResponseDto> {
    await this.requireScoped(user, id, 'update');
    const updated = await this.repo.update(id, {
      stage: dto.stage,
      updatedByUserId: user.id,
    });
    return OrderResponseDto.from(updated);
  }

  async approve(
    user: AuthUser,
    id: string,
    dto: ApproveOrderDto,
  ): Promise<OrderResponseDto> {
    await this.requireScoped(user, id, 'update');
    const existing = await this.repo.findById(id);
    const history = Array.isArray(existing?.approvalHistory)
      ? [...(existing!.approvalHistory as unknown[])]
      : [];
    history.push({
      at: new Date().toISOString(),
      by: user.id,
      note: dto.note ?? null,
      status: 'approved',
    });
    const updated = await this.repo.update(id, {
      approvalStatus: 'approved',
      reviewerUserId: user.id,
      approvalHistory: history as Prisma.InputJsonValue,
      updatedByUserId: user.id,
    });
    return OrderResponseDto.from(updated);
  }

  async getPaymentSchedule(
    user: AuthUser,
    orderId: string,
  ): Promise<PaymentScheduleResponseDto> {
    await this.requireScoped(user, orderId, 'view');
    const schedule = await this.repo.getPaymentSchedule(orderId);
    if (!schedule) throw new NotFoundException('Payment schedule not found');
    return PaymentScheduleResponseDto.from(schedule);
  }

  async createPaymentSchedule(
    user: AuthUser,
    orderId: string,
    dto: CreatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    await this.requireScoped(user, orderId, 'update');
    const schedule = await this.repo.upsertPaymentSchedule(
      orderId,
      user.id,
      dto.lines.map((l) => ({
        dueDate: l.dueDate ? new Date(l.dueDate) : undefined,
        amount: new Prisma.Decimal(l.amount),
        sortOrder: l.sortOrder,
      })),
    );
    return PaymentScheduleResponseDto.from(schedule);
  }

  private async assertRefs(
    contractId: string,
    customerId: string,
    serviceId: string,
  ) {
    const [contract, customer, service] = await Promise.all([
      this.repo.findContract(contractId),
      this.repo.findCustomer(customerId),
      this.repo.findService(serviceId),
    ]);
    if (!contract) throw new BadRequestException('Contract not found');
    if (!customer) throw new BadRequestException('Customer not found');
    if (!service) throw new BadRequestException('Service not found');
  }

  private async requireScoped(
    user: AuthUser,
    id: string,
    mode: 'view' | 'update',
  ) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Order not found');
    const ok =
      mode === 'view'
        ? this.policy.canView(user.id, user.permissions, record)
        : this.policy.canUpdate(user.id, user.permissions, record);
    if (!ok) throw new ForbiddenException('Outside data scope');
    return record;
  }
}
