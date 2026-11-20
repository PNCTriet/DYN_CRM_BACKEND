import { civilDateInTimeZone } from './civil-date';
import {
  licenseWarnMonthsFromCustomFields,
  licenseWarnUntil,
  planDailyNotifications,
  vatWarnDaysFromConfig,
  vatWarnUntil,
  type ScanOrder,
  type ScanPaymentLine,
} from './notification-scan.planner';

const ASSIGNEE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORDER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LINE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function order(overrides: Partial<ScanOrder> = {}): ScanOrder {
  return {
    id: ORDER_ID,
    orderNumber: 'DH-001',
    customerName: 'Công ty A',
    serviceName: 'Thành lập DN',
    assignedUserId: ASSIGNEE,
    assigneeActive: true,
    stage: 'processing',
    deadline: null,
    needsVat: false,
    vatIssueDeadline: null,
    hasIssuedVat: false,
    licenseWarnMonths: 2,
    earliestLicenseExpiry: null,
    ...overrides,
  };
}

function line(overrides: Partial<ScanPaymentLine> = {}): ScanPaymentLine {
  return {
    id: LINE_ID,
    orderId: ORDER_ID,
    orderNumber: 'DH-001',
    customerName: 'Công ty A',
    serviceName: 'Thành lập DN',
    assignedUserId: ASSIGNEE,
    assigneeActive: true,
    stage: 'processing',
    dueDate: '2026-11-19',
    amount: '1000000',
    paidAmount: '0',
    ...overrides,
  };
}

function keysFor(now: Date, orders: ScanOrder[] = [], paymentLines: ScanPaymentLine[] = []) {
  return planDailyNotifications({
    now,
    vatWarnDays: 30,
    orders,
    paymentLines,
  }).map((item) => item.dedupeKey);
}

describe('notification scan date boundaries (Asia/Ho_Chi_Minh)', () => {
  const beforeMidnight = new Date('2026-11-19T16:59:00.000Z');
  const afterMidnight = new Date('2026-11-19T17:00:00.000Z');

  it('treats 17:00 UTC as the next civil day in Ho Chi Minh', () => {
    expect(civilDateInTimeZone(beforeMidnight)).toBe('2026-11-19');
    expect(civilDateInTimeZone(afterMidnight)).toBe('2026-11-20');
  });

  it('marks an order overdue only after the deadline civil day has ended', () => {
    const dueToday = [order({ deadline: '2026-11-19' })];
    expect(keysFor(beforeMidnight, dueToday)).toEqual([]);
    expect(keysFor(afterMidnight, dueToday)).toEqual([
      `order_overdue:${ORDER_ID}:2026-11-20`,
    ]);
  });

  it('keeps a deadline that is still today out of the overdue set', () => {
    const morning = new Date('2026-11-20T00:00:00.000Z');
    expect(civilDateInTimeZone(morning)).toBe('2026-11-20');
    expect(keysFor(morning, [order({ deadline: '2026-11-20' })])).toEqual([]);
    expect(keysFor(morning, [order({ deadline: '2026-11-19' })])).toEqual([
      `order_overdue:${ORDER_ID}:2026-11-20`,
    ]);
  });

  it('splits VAT approaching and overdue on today and on the warn-day edge', () => {
    const now = new Date('2026-11-19T17:30:00.000Z');
    expect(civilDateInTimeZone(now)).toBe('2026-11-20');
    expect(vatWarnUntil('2026-11-20', 30)).toBe('2026-12-20');

    const plan = (deadline: string, extra: Partial<ScanOrder> = {}) =>
      planDailyNotifications({
        now,
        vatWarnDays: 30,
        orders: [
          order({
            needsVat: true,
            vatIssueDeadline: deadline,
            ...extra,
          }),
        ],
        paymentLines: [],
      });

    expect(plan('2026-11-20').map((item) => item.type)).toEqual([
      'vat_deadline_approaching',
    ]);
    expect(plan('2026-12-20').map((item) => item.type)).toEqual([
      'vat_deadline_approaching',
    ]);
    expect(plan('2026-12-21')).toEqual([]);
    expect(plan('2026-11-19').map((item) => item.type)).toEqual(['vat_overdue']);
    expect(plan('2026-11-19', { hasIssuedVat: true })).toEqual([]);
    expect(plan('2026-11-19', { needsVat: false })).toEqual([]);
  });

  it('warns for a license inside the month window and ignores an already expired earliest date', () => {
    const now = new Date('2026-01-14T17:30:00.000Z');
    expect(civilDateInTimeZone(now)).toBe('2026-01-15');
    expect(licenseWarnUntil('2026-01-15', 2)).toBe('2026-03-15');
    expect(licenseWarnUntil('2026-01-31', 1)).toBe('2026-03-03');

    const plan = (expiry: string | null) =>
      planDailyNotifications({
        now,
        vatWarnDays: 30,
        orders: [order({ earliestLicenseExpiry: expiry, licenseWarnMonths: 2 })],
        paymentLines: [],
      });

    expect(plan('2026-01-15').map((item) => item.dedupeKey)).toEqual([
      `license_expiring:${ORDER_ID}:2026-01-15`,
    ]);
    expect(plan('2026-03-15').map((item) => item.type)).toEqual(['license_expiring']);
    expect(plan('2026-03-16')).toEqual([]);
    expect(plan('2026-01-14')).toEqual([]);
    expect(plan(null)).toEqual([]);
  });

  it('flags an unpaid installment only after its due date, including a completed order', () => {
    const now = new Date('2026-11-19T17:30:00.000Z');
    const plan = (overrides: Partial<ScanPaymentLine>) =>
      planDailyNotifications({
        now,
        vatWarnDays: 30,
        orders: [],
        paymentLines: [line(overrides)],
      });

    expect(plan({ dueDate: '2026-11-19' }).map((item) => item.dedupeKey)).toEqual([
      `payment_overdue:${LINE_ID}:2026-11-20`,
    ]);
    expect(plan({ dueDate: '2026-11-20' })).toEqual([]);
    expect(plan({ paidAmount: '1000000' })).toEqual([]);
    expect(plan({ paidAmount: '999999.99' })).toHaveLength(1);
    expect(plan({ stage: 'completed' })).toHaveLength(1);
    expect(plan({ stage: 'cancelled' })).toEqual([]);
    expect(plan({ assigneeActive: false })).toEqual([]);
    const row = plan({})[0];
    expect(row.href).toBe(`/payments/${ORDER_ID}`);
    expect(row.recipientUserIds).toEqual([ASSIGNEE]);
  });

  it('does not nag a completed order for processing deadline, but still nags for VAT', () => {
    const now = new Date('2026-11-19T17:30:00.000Z');
    const rows = planDailyNotifications({
      now,
      vatWarnDays: 30,
      orders: [
        order({
          stage: 'completed',
          deadline: '2026-11-01',
          needsVat: true,
          vatIssueDeadline: '2026-11-01',
        }),
      ],
      paymentLines: [],
    });
    expect(rows.map((item) => item.type)).toEqual(['vat_overdue']);
  });

  it('skips cancelled orders entirely', () => {
    const now = new Date('2026-11-19T17:30:00.000Z');
    const rows = planDailyNotifications({
      now,
      vatWarnDays: 30,
      orders: [
        order({
          stage: 'Cancelled',
          deadline: '2026-11-01',
          needsVat: true,
          vatIssueDeadline: '2026-11-01',
          earliestLicenseExpiry: '2026-11-25',
        }),
      ],
      paymentLines: [line({ stage: 'canceled' })],
    });
    expect(rows).toEqual([]);
  });

  it('reuses the same dedupe keys when the scan runs twice on one civil day', () => {
    const now = new Date('2026-11-19T17:30:00.000Z');
    const orders = [
      order({
        deadline: '2026-11-01',
        needsVat: true,
        vatIssueDeadline: '2026-11-25',
        earliestLicenseExpiry: '2026-12-01',
      }),
    ];
    const paymentLines = [line()];
    const first = keysFor(now, orders, paymentLines);
    const second = keysFor(now, orders, paymentLines);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
    expect(first).toEqual([
      `order_overdue:${ORDER_ID}:2026-11-20`,
      `vat_deadline_approaching:${ORDER_ID}:2026-11-20`,
      `license_expiring:${ORDER_ID}:2026-11-20`,
      `payment_overdue:${LINE_ID}:2026-11-20`,
    ]);

    const nextMorning = new Date('2026-11-20T17:30:00.000Z');
    const next = keysFor(nextMorning, orders, paymentLines);
    expect(next.every((key) => key.endsWith(':2026-11-21'))).toBe(true);
    expect(next).not.toEqual(first);
  });
});

describe('notification warn thresholds', () => {
  it('clamps VAT warn days the way the frontend does', () => {
    expect(vatWarnDaysFromConfig(undefined)).toBe(30);
    expect(vatWarnDaysFromConfig({ vatIssueWarnDays: 3 })).toBe(7);
    expect(vatWarnDaysFromConfig({ vatIssueWarnDays: 100 })).toBe(90);
    expect(vatWarnDaysFromConfig('{"vatIssueWarnDays":14}')).toBe(14);
  });

  it('clamps per-service license warn months', () => {
    expect(licenseWarnMonthsFromCustomFields(null)).toBe(2);
    expect(
      licenseWarnMonthsFromCustomFields({ licenseExpiryWarnMonths: 0 }),
    ).toBe(1);
    expect(
      licenseWarnMonthsFromCustomFields({ licenseExpiryWarnMonths: 40 }),
    ).toBe(24);
    expect(
      licenseWarnMonthsFromCustomFields('{"licenseExpiryWarnMonths":6}'),
    ).toBe(6);
  });
});
