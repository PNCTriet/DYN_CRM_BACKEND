import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../identity/domain/auth-user';
import { OrderRepository } from '../infrastructure/prisma/order.repository';
import { VatInvoiceRepository } from '../infrastructure/prisma/vat-invoice.repository';
import {
  CreateVatInvoiceDto,
  IssueVatInvoiceDto,
  ListVatInvoicesQueryDto,
  VatInvoiceResponseDto,
} from './dto/vat-invoice.dto';

@Injectable()
export class VatInvoiceApplicationService {
  constructor(
    private readonly repo: VatInvoiceRepository,
    private readonly orders: OrderRepository,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateVatInvoiceDto,
  ): Promise<VatInvoiceResponseDto> {
    const order = await this.orders.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    const created = await this.repo.create({
      invoiceNumber: dto.invoiceNumber,
      order: { connect: { id: dto.orderId } },
      ...(dto.paymentId
        ? { payment: { connect: { id: dto.paymentId } } }
        : {}),
      sourceType: dto.sourceType,
      customerName: dto.customerName,
      customerTaxCode: dto.customerTaxCode,
      netAmount: new Prisma.Decimal(dto.netAmount),
      vatRate: new Prisma.Decimal(dto.vatRate ?? 10),
      vatAmount: new Prisma.Decimal(dto.vatAmount),
      grossAmount: new Prisma.Decimal(dto.grossAmount),
      status: InvoiceStatus.DRAFT,
      lines: dto.lines
        ? (dto.lines as Prisma.InputJsonValue)
        : undefined,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });
    return VatInvoiceResponseDto.from(created);
  }

  async list(user: AuthUser, query: ListVatInvoicesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.repo.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderId: query.orderId,
    });
    return {
      items: rows.map((r) => VatInvoiceResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(user: AuthUser, id: string): Promise<VatInvoiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('VAT invoice not found');
    return VatInvoiceResponseDto.from(record);
  }

  async issue(
    user: AuthUser,
    id: string,
    dto: IssueVatInvoiceDto,
  ): Promise<VatInvoiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('VAT invoice not found');
    if (record.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const updated = await this.repo.update(id, {
      status: InvoiceStatus.ISSUED,
      issueDate,
      updatedByUserId: user.id,
    });
    return VatInvoiceResponseDto.from(updated);
  }

  async cancel(user: AuthUser, id: string): Promise<VatInvoiceResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('VAT invoice not found');
    if (record.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice already cancelled');
    }
    const updated = await this.repo.update(id, {
      status: InvoiceStatus.CANCELLED,
      updatedByUserId: user.id,
    });
    return VatInvoiceResponseDto.from(updated);
  }
}
