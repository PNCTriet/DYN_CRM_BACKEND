-- Email templates (CRM-managed transactional content)
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- Per-user channel preferences (EMAIL / IN_APP / TELEGRAM)
CREATE TABLE "user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channel_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_preferences_user_id_channel_event_type_key"
  ON "user_notification_preferences"("user_id", "channel", "event_type");
CREATE INDEX "user_notification_preferences_user_id_idx"
  ON "user_notification_preferences"("user_id");

-- Enrich outbound email logs for Resend ops
ALTER TABLE "outbound_email_logs" ADD COLUMN "from_address" TEXT;
ALTER TABLE "outbound_email_logs" ADD COLUMN "subject" TEXT;
ALTER TABLE "outbound_email_logs" ADD COLUMN "error_message" TEXT;

CREATE INDEX "outbound_email_logs_template_key_idx" ON "outbound_email_logs"("template_key");
CREATE INDEX "outbound_email_logs_created_at_idx" ON "outbound_email_logs"("created_at");
