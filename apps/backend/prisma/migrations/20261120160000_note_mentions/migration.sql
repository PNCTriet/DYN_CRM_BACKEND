-- Order discussion mentions. One row per (note, user).
-- Deleting a note removes its mentions. Users are not cascade-deleted.

CREATE TABLE "note_mentions" (
    "note_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "note_mentions_pkey" PRIMARY KEY ("note_id","user_id")
);

CREATE INDEX "note_mentions_user_id_idx" ON "note_mentions"("user_id");

ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
