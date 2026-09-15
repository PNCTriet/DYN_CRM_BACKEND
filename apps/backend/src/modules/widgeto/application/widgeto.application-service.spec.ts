import { mapGroupedCounts } from './widgeto.application-service';

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
