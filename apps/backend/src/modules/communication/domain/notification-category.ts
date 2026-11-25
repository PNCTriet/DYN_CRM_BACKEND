/**
 * Inbox buckets for sidebar badges.
 *
 * Keys follow the CRM-DNY-UI sidebar (`apps/web/src/components/layout/app-shell.tsx`
 * and `SYSTEM_PAGES` in `apps/web/src/lib/types.ts`). `licenses` has no menu item:
 * giấy phép lives on the order. `expenses` badges "Đề nghị thanh toán"
 * (`/expense-approvals`, i18n `nav.expenses`), not a route named /expenses.
 */
export const NOTIFICATION_CATEGORIES = [
  'orders',
  'expenses',
  'payments',
  'vat',
  'licenses',
  'users',
  'emails',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  'task_assigned',
  'order_mentioned',
  'order_overdue',
  'expense_pending',
  'expense_reviewed',
  'payment_overdue',
  'vat_deadline_approaching',
  'vat_overdue',
  'license_expiring',
  'user_pending',
  'user_approved',
  'email_sent',
  'email_failed',
] as const;

export type NotificationTypeName = (typeof NOTIFICATION_TYPES)[number];

const TYPE_CATEGORY: Record<NotificationTypeName, NotificationCategory> = {
  task_assigned: 'orders',
  order_mentioned: 'orders',
  order_overdue: 'orders',
  expense_pending: 'expenses',
  expense_reviewed: 'expenses',
  payment_overdue: 'payments',
  vat_deadline_approaching: 'vat',
  vat_overdue: 'vat',
  license_expiring: 'licenses',
  user_pending: 'users',
  user_approved: 'users',
  email_sent: 'emails',
  email_failed: 'emails',
};

export function isNotificationCategory(
  value: string,
): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

export function categoryForType(type: string): NotificationCategory {
  if (Object.prototype.hasOwnProperty.call(TYPE_CATEGORY, type)) {
    return TYPE_CATEGORY[type as NotificationTypeName];
  }
  return 'orders';
}

export function emptyCategoryCounts(): Record<NotificationCategory, number> {
  return {
    orders: 0,
    expenses: 0,
    payments: 0,
    vat: 0,
    licenses: 0,
    users: 0,
    emails: 0,
  };
}
