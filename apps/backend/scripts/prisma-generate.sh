#!/usr/bin/env sh
# Generate Prisma Client for Nest build (Railway / CI safe).
# Schema references DATABASE_URL / DIRECT_URL — placeholders are enough for `generate`.
set -eu
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
fi
if [ -z "${DIRECT_URL:-}" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

echo "[prisma-generate] schema=prisma/schema.prisma"
npx prisma generate --schema=prisma/schema.prisma
