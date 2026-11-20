-- Inbox category for sidebar badges, plus an index for unread counts.
-- Safe on a table that already has rows: add nullable, backfill, then NOT NULL.

ALTER TABLE "notifications" ADD COLUMN "category" TEXT;

UPDATE "notifications"
SET "category" = CASE "type"
  WHEN 'task_assigned' THEN 'orders'
  WHEN 'order_overdue' THEN 'orders'
  WHEN 'expense_pending' THEN 'expenses'
  WHEN 'expense_reviewed' THEN 'expenses'
  WHEN 'payment_overdue' THEN 'payments'
  WHEN 'vat_deadline_approaching' THEN 'vat'
  WHEN 'vat_overdue' THEN 'vat'
  WHEN 'license_expiring' THEN 'licenses'
  WHEN 'user_pending' THEN 'users'
  WHEN 'user_approved' THEN 'users'
  WHEN 'email_sent' THEN 'emails'
  WHEN 'email_failed' THEN 'emails'
  ELSE 'orders'
END
WHERE "category" IS NULL;

ALTER TABLE "notifications" ALTER COLUMN "category" SET NOT NULL;

CREATE INDEX "notifications_recipient_user_id_read_at_idx"
  ON "notifications"("recipient_user_id", "read_at");
