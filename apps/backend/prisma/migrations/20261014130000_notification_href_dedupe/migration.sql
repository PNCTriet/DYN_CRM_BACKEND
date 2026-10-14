ALTER TABLE "notifications" ADD COLUMN "href" TEXT;
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;

CREATE UNIQUE INDEX "notifications_recipient_user_id_dedupe_key_key"
  ON "notifications"("recipient_user_id", "dedupe_key");
