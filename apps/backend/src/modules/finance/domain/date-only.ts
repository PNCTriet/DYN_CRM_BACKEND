import { BadRequestException } from '@nestjs/common';

/**
 * Order `deadline` is a civil calendar day in Asia/Ho_Chi_Minh, stored as
 * PostgreSQL DATE (no time). Vietnam is UTC+7 year-round, so the UTC calendar
 * date of `YYYY-MM-DDT00:00:00.000Z` is the same civil day. Writing that
 * instant keeps the day from shifting when the column drops the time.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    throw new BadRequestException(
      'deadline must be a date-only string YYYY-MM-DD',
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new BadRequestException('deadline is not a valid calendar date');
  }
  return utc;
}

export function formatDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
