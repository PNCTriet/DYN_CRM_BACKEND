import {
  mapGroupedCounts,
  summaryToW12,
  customersToW12,
} from './widgeto.application-service';

describe('mapGroupedCounts', () => {
  it('sums totals and builds Record by key', () => {
    const result = mapGroupedCounts(
      [
        { status: 'active', _count: { _all: 3 } },
        { status: 'lead', _count: { _all: 2 } },
      ],
      'status',
    );
    expect(result.total).toBe(5);
    expect(result.byKey).toEqual({ active: 3, lead: 2 });
  });

  it('uses unknown for empty label', () => {
    const result = mapGroupedCounts(
      [{ stage: '', _count: { _all: 1 } }],
      'stage',
    );
    expect(result.byKey).toEqual({ unknown: 1 });
    expect(result.total).toBe(1);
  });
});

describe('W12 mappers', () => {
  it('summaryToW12 returns ≤12 rows with required keys', () => {
    const rows = summaryToW12({
      generatedAt: new Date().toISOString(),
      customers: { total: 4, byStatus: { active: 4 } },
      orders: { total: 2, byStage: { new: 2 } },
      payments: {
        totalCount: 3,
        verifiedCount: 1,
        verifiedAmount: '1000000',
        byStatus: { RECORDED: 2, VERIFIED: 1, VOIDED: 0 },
      },
    });
    expect(rows.length).toBeLessThanOrEqual(12);
    expect(rows[0].key).toBe('DYN CRM');
    expect(rows.some((r) => r.key === 'Customers' && r.value === '4')).toBe(
      true,
    );
  });

  it('customersToW12 lists status breakdown', () => {
    const rows = customersToW12({
      total: 5,
      byStatus: { active: 3, lead: 2 },
    });
    expect(rows[0].color).toBe('main');
    expect(rows.some((r) => r.key === 'lead' && r.value === '2')).toBe(true);
  });
});
