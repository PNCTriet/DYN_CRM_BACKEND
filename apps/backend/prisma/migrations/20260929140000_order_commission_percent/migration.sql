-- Staff commission percent on the order (assigned user). Nullable so existing rows stay null.
ALTER TABLE "orders" ADD COLUMN "commission_percent" DECIMAL(5,2);
