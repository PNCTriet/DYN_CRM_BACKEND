import { BadRequestException } from '@nestjs/common';
import { formatDateOnly, parseDateOnly } from './date-only';

describe('date-only', () => {
  it('round-trips a calendar day as UTC midnight', () => {
    const parsed = parseDateOnly('2026-10-20');
    expect(parsed.toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(formatDateOnly(parsed)).toBe('2026-10-20');
  });

  it('rejects impossible calendar days and non date-only strings', () => {
    expect(() => parseDateOnly('2026-02-31')).toThrow(BadRequestException);
    expect(() => parseDateOnly('2026-10-20T00:00:00.000Z')).toThrow(
      BadRequestException,
    );
  });

  it('formats null as null', () => {
    expect(formatDateOnly(null)).toBeNull();
  });
});
