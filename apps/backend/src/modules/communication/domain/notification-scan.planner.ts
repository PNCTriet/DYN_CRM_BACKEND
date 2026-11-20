import { Prisma } from '@prisma/client';
import type { NotifyInput } from '../application/notification.publisher';
import {
  addCalendarDays,
  addCalendarMonths,
  civilDateInTimeZone,
  daysBetween,
  isIsoDate,
  NOTIFICATION_TIME_ZONE,
} from './civil-date';

/** FE `setVatIssueWarnDays` clamps to this range. Default matches the UI. */
export const DEFAULT_VAT_WARN_DAYS = 30;
export const MIN_VAT_WARN_DAYS = 7;
export const MAX_VAT_WARN_DAYS = 90;

/** FE `licenseWarnMonthsOf`: default 2, clamp 1–24. */
export const DEFAULT_LICENSE_WARN_MONTHS = 2;
export const MIN_LICENSE_WARN_MONTHS = 1;
export const MAX_LICENSE_WARN_MONTHS = 24;

const CLOSED_WORK_STAGES = new Set(['completed', 'cancelled', 'canceled']);
const CANCELLED_STAGES = new Set(['cancelled', 'canceled']);

export type ScanOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  serviceName: string | null;
  assignedUserId: string;
  assigneeActive: boolean;
  stage: string;
  deadline: string | null;
  needsVat: boolean;
  vatIssueDeadline: string | null;
  hasIssuedVat: boolean;
  licenseWarnMonths: number;
  /** Earliest license `expiresAt` on the order, including dates already past. */
  earliestLicenseExpiry: string | null;
};

export type ScanPaymentLine = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  serviceName: string | null;
  assignedUserId: string;
  assigneeActive: boolean;
  stage: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
};

export type ScanSnapshot = {
  now: Date;
  vatWarnDays: number;
  orders: ScanOrder[];
  paymentLines: ScanPaymentLine[];
};

export function vatWarnDaysFromConfig(valueJson: unknown): number {
  const parsed = parseJson(valueJson);
  const raw =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as { vatIssueWarnDays?: unknown }).vatIssueWarnDays
      : undefined;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return DEFAULT_VAT_WARN_DAYS;
  return clamp(Math.round(numeric), MIN_VAT_WARN_DAYS, MAX_VAT_WARN_DAYS);
}

export function licenseWarnMonthsFromCustomFields(customFields: unknown): number {
  const parsed = parseJson(customFields);
  const raw =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as { licenseExpiryWarnMonths?: unknown }).licenseExpiryWarnMonths
      : undefined;
  const numeric = typeof raw === 'number' ? raw : Number.NaN;
  if (!Number.isFinite(numeric)) return DEFAULT_LICENSE_WARN_MONTHS;
  return clamp(
    Math.round(numeric),
    MIN_LICENSE_WARN_MONTHS,
    MAX_LICENSE_WARN_MONTHS,
  );
}

/**
 * `document_metadata.file_type` uses the FE encoding
 * `license|{issuedAt}|{expiresAt}` (`encodeLicenseFileType`).
 * Returns the earliest expiry, or null when no dated license file exists.
 * `serviceEnd` is not a license date.
 */
export function earliestLicenseExpiry(
  fileTypes: Array<string | null | undefined>,
): string | null {
  const dates = fileTypes
    .map(licenseExpiresOn)
    .filter((value): value is string => value != null)
    .sort();
  return dates[0] ?? null;
}

export function licenseExpiresOn(
  fileType: string | null | undefined,
): string | null {
  if (!fileType) return null;
  if (fileType !== 'license' && !fileType.startsWith('license|')) return null;
  const expiresAt = fileType.split('|')[2];
  if (!expiresAt || !isIsoDate(expiresAt)) return null;
  return expiresAt;
}

/**
 * Daily inbox rows. Dedupe keys include the Asia/Ho_Chi_Minh civil date, so a
 * re-run the same morning is a no-op and the next morning can remind again.
 *
 * Boundaries (civil `today`, compared as `YYYY-MM-DD`):
 * - order overdue: `deadline < today`, and the stage is not completed/cancelled
 * - VAT approaching: needs VAT, no ISSUED invoice, `0 <= deadline-today <= warnDays`
 * - VAT overdue: needs VAT, no ISSUED invoice, `deadline < today`
 * - payment overdue: line `dueDate < today` and recorded/verified payments do not cover it
 * - license expiring: earliest license expiry is today through today+N months
 *   (an already-past earliest expiry is "expired", not this type)
 *
 * Cancelled orders are skipped. Completed orders still raise VAT, payment, and
 * license alerts. Recipient is the order assignee when that user is ACTIVE.
 */
export function planDailyNotifications(snapshot: ScanSnapshot): NotifyInput[] {
  const today = civilDateInTimeZone(snapshot.now, NOTIFICATION_TIME_ZONE);
  const warnDays = clamp(
    snapshot.vatWarnDays,
    MIN_VAT_WARN_DAYS,
    MAX_VAT_WARN_DAYS,
  );
  const planned: NotifyInput[] = [];

  for (const order of snapshot.orders) {
    if (!order.assigneeActive || !order.assignedUserId) continue;
    const cancelled = isCancelledStage(order.stage);
    const closedWork = isClosedWorkStage(order.stage);
    const detail = contextLine(order.customerName, order.serviceName);

    if (!cancelled && !closedWork && order.deadline && order.deadline < today) {
      planned.push(
        orderNotice({
          order,
          type: 'order_overdue',
          title: `Đơn ${order.orderNumber} quá hạn xử lý`,
          body: joinDetail(detail, `Hạn ${order.deadline}`),
          href: `/orders/${order.id}`,
          dedupeKey: `order_overdue:${order.id}:${today}`,
        }),
      );
    }

    if (!cancelled && order.needsVat && order.vatIssueDeadline && !order.hasIssuedVat) {
      const days = daysBetween(today, order.vatIssueDeadline);
      if (days < 0) {
        planned.push(
          orderNotice({
            order,
            type: 'vat_overdue',
            title: `Quá hạn xuất VAT — ${order.orderNumber}`,
            body: joinDetail(detail, `Hạn ${order.vatIssueDeadline}`),
            href: `/orders/${order.id}`,
            dedupeKey: `vat_overdue:${order.id}:${today}`,
          }),
        );
      } else if (days <= warnDays) {
        planned.push(
          orderNotice({
            order,
            type: 'vat_deadline_approaching',
            title: `Sắp đến hạn xuất VAT — ${order.orderNumber}`,
            body: joinDetail(detail, `Hạn ${order.vatIssueDeadline}`),
            href: `/orders/${order.id}`,
            dedupeKey: `vat_deadline_approaching:${order.id}:${today}`,
          }),
        );
      }
    }

    if (!cancelled && order.earliestLicenseExpiry) {
      const expiry = order.earliestLicenseExpiry;
      const warnUntil = addCalendarMonths(today, order.licenseWarnMonths);
      if (expiry >= today && expiry <= warnUntil) {
        planned.push(
          orderNotice({
            order,
            type: 'license_expiring',
            title: `Giấy phép sắp hết hạn — ${order.orderNumber}`,
            body: joinDetail(detail, `Hết hạn ${expiry}`),
            href: `/orders/${order.id}`,
            dedupeKey: `license_expiring:${order.id}:${today}`,
          }),
        );
      }
    }
  }

  for (const line of snapshot.paymentLines) {
    if (!line.assigneeActive || !line.assignedUserId) continue;
    if (isCancelledStage(line.stage)) continue;
    if (!isIsoDate(line.dueDate) || !(line.dueDate < today)) continue;
    if (!hasOutstanding(line.amount, line.paidAmount)) continue;
    const detail = contextLine(line.customerName, line.serviceName);
    planned.push({
      recipientUserIds: [line.assignedUserId],
      type: 'payment_overdue',
      title: `Kỳ thanh toán quá hạn — ${line.orderNumber}`,
      body: joinDetail(detail, `Hạn ${line.dueDate}`),
      sourceType: 'payment',
      sourceId: line.orderId,
      href: `/payments/${line.orderId}`,
      dedupeKey: `payment_overdue:${line.id}:${today}`,
    });
  }

  return planned;
}

export function isClosedWorkStage(stage: string): boolean {
  return CLOSED_WORK_STAGES.has(stage.trim().toLowerCase());
}

export function isCancelledStage(stage: string): boolean {
  return CANCELLED_STAGES.has(stage.trim().toLowerCase());
}

/** Exposed for tests that want the warn-until date the planner uses. */
export function licenseWarnUntil(today: string, months: number): string {
  return addCalendarMonths(today, months);
}

export function vatWarnUntil(today: string, warnDays: number): string {
  return addCalendarDays(today, warnDays);
}

function orderNotice(input: {
  order: ScanOrder;
  type: string;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
}): NotifyInput {
  return {
    recipientUserIds: [input.order.assignedUserId],
    type: input.type,
    title: input.title,
    body: input.body,
    sourceType: 'order',
    sourceId: input.order.id,
    href: input.href,
    dedupeKey: input.dedupeKey,
  };
}

function contextLine(
  customerName: string | null,
  serviceName: string | null,
): string {
  return [customerName, serviceName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join(' — ');
}

function joinDetail(detail: string, extra: string): string {
  return detail ? `${detail} · ${extra}` : extra;
}

function hasOutstanding(amount: string, paidAmount: string): boolean {
  return new Prisma.Decimal(paidAmount).lessThan(amount);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
