import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus, PaymentVerificationStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  civilDateInTimeZone,
  dateOnlyToIso,
  isoDateToUtcDate,
  NOTIFICATION_TIME_ZONE,
} from '../domain/civil-date';
import {
  earliestLicenseExpiry,
  licenseWarnMonthsFromCustomFields,
  planDailyNotifications,
  type ScanOrder,
  type ScanPaymentLine,
  vatWarnDaysFromConfig,
} from '../domain/notification-scan.planner';
import { NotificationPublisher } from './notification.publisher';

export type NotificationScanResult = {
  civilDate: string;
  timeZone: string;
  candidates: number;
  inserted: number;
  existing: number;
};

@Injectable()
export class NotificationScanService {
  private readonly logger = new Logger(NotificationScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisher,
  ) {}

  /**
   * Idempotent daily scan. Safe to call from cron and from the manual endpoint.
   * Unique `(recipientUserId, dedupeKey)` drops a second run on the same civil day.
   */
  async run(now: Date = new Date()): Promise<NotificationScanResult> {
    const civilDate = civilDateInTimeZone(now, NOTIFICATION_TIME_ZONE);
    const [orders, paymentLines, vatWarnDays] = await Promise.all([
      this.loadOrders(),
      this.loadPaymentLines(civilDate),
      this.loadVatWarnDays(),
    ]);
    const assigneeIds = [
      ...orders.map((order) => order.assignedUserId),
      ...paymentLines.map((line) => line.schedule.order.assignedUserId),
    ];
    const customerIds = [
      ...orders.map((order) => order.customerId),
      ...paymentLines.map((line) => line.schedule.order.customerId),
    ];
    const [activeIds, customerNames] = await Promise.all([
      this.loadActiveUserIds(assigneeIds),
      this.loadCustomerNames(customerIds),
    ]);

    const planned = planDailyNotifications({
      now,
      vatWarnDays,
      orders: orders.map((order) =>
        this.toScanOrder(order, activeIds, customerNames),
      ),
      paymentLines: paymentLines.map((line) =>
        this.toScanPayment(line, activeIds, customerNames),
      ),
    });

    let inserted = 0;
    let existing = 0;
    for (const item of planned) {
      const result = await this.notifications.notify(item);
      inserted += result.inserted;
      existing += result.existing;
    }

    this.logger.log(
      `notification scan ${civilDate} candidates=${planned.length} inserted=${inserted} existing=${existing}`,
    );

    return {
      civilDate,
      timeZone: NOTIFICATION_TIME_ZONE,
      candidates: planned.length,
      inserted,
      existing,
    };
  }

  private loadVatWarnDays(): Promise<number> {
    return this.prisma.appConfig
      .findUnique({ where: { key: 'crm.reminders' } })
      .then((row) => vatWarnDaysFromConfig(row?.valueJson));
  }

  private loadOrders() {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { deadline: { not: null } },
          { AND: [{ needsVat: true }, { vatIssueDeadline: { not: null } }] },
          {
            documents: {
              some: {
                deletedAt: null,
                OR: [
                  { fileType: 'license' },
                  { fileType: { startsWith: 'license|' } },
                ],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        assignedUserId: true,
        stage: true,
        deadline: true,
        needsVat: true,
        vatIssueDeadline: true,
        service: { select: { name: true, customFields: true } },
        documents: {
          where: { deletedAt: null },
          select: { fileType: true },
        },
        vatInvoices: {
          where: { status: InvoiceStatus.ISSUED },
          select: { id: true },
        },
      },
    });
  }

  /** Lines already before the civil today. The planner checks the date again. */
  private loadPaymentLines(civilDate: string) {
    return this.prisma.paymentScheduleLine.findMany({
      where: { dueDate: { lt: isoDateToUtcDate(civilDate) } },
      select: {
        id: true,
        dueDate: true,
        amount: true,
        payments: {
          select: { amount: true, verificationStatus: true },
        },
        schedule: {
          select: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerId: true,
                assignedUserId: true,
                stage: true,
                service: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  private async loadActiveUserIds(ids: string[]): Promise<Set<string>> {
    const unique = [...new Set(ids.filter((id) => id.length > 0))];
    if (unique.length === 0) return new Set();
    const rows = await this.prisma.user.findMany({
      where: {
        id: { in: unique },
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }

  private async loadCustomerNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id) => id.length > 0))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }

  private toScanOrder(
    order: Awaited<ReturnType<NotificationScanService['loadOrders']>>[number],
    activeIds: Set<string>,
    customerNames: Map<string, string>,
  ): ScanOrder {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: customerNames.get(order.customerId) ?? null,
      serviceName: order.service.name,
      assignedUserId: order.assignedUserId,
      assigneeActive: activeIds.has(order.assignedUserId),
      stage: order.stage,
      deadline: dateOnlyToIso(order.deadline),
      needsVat: order.needsVat,
      vatIssueDeadline: dateOnlyToIso(order.vatIssueDeadline),
      hasIssuedVat: order.vatInvoices.length > 0,
      licenseWarnMonths: licenseWarnMonthsFromCustomFields(
        order.service.customFields,
      ),
      earliestLicenseExpiry: earliestLicenseExpiry(
        order.documents.map((document) => document.fileType),
      ),
    };
  }

  private toScanPayment(
    line: Awaited<ReturnType<NotificationScanService['loadPaymentLines']>>[number],
    activeIds: Set<string>,
    customerNames: Map<string, string>,
  ): ScanPaymentLine {
    const order = line.schedule.order;
    const paid = line.payments
      .filter(
        (payment) =>
          payment.verificationStatus !== PaymentVerificationStatus.VOIDED,
      )
      .reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
    return {
      id: line.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customerNames.get(order.customerId) ?? null,
      serviceName: order.service.name,
      assignedUserId: order.assignedUserId,
      assigneeActive: activeIds.has(order.assignedUserId),
      stage: order.stage,
      dueDate: dateOnlyToIso(line.dueDate) ?? '',
      amount: line.amount.toString(),
      paidAmount: paid.toString(),
    };
  }
}
