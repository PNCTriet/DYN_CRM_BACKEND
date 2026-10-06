import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOrderDto } from './update-order.dto';

async function parse(body: Record<string, unknown>) {
  const dto = plainToInstance(UpdateOrderDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, errors };
}

describe('UpdateOrderDto', () => {
  it('keeps omitted fields undefined and accepts null for nullable fields', async () => {
    const { dto, errors } = await parse({
      deadline: null,
      zaloGroupUrl: null,
    });
    expect(errors).toHaveLength(0);
    expect(dto.deadline).toBeNull();
    expect(dto.zaloGroupUrl).toBeNull();
    expect(dto.customerId).toBeUndefined();
    expect(dto.serviceId).toBeUndefined();
    expect(dto.submitterUserId).toBeUndefined();
    expect(dto.notes).toBeUndefined();
    expect(dto.value).toBeUndefined();
  });

  it('accepts the edit-form payload', async () => {
    const { errors } = await parse({
      customerId: '2a33afe5-8ed9-4a0f-b643-727fddc56b91',
      serviceId: '67ca3320-ed6c-4966-afd5-dd6d6c7bf2db',
      submitterUserId: 'fd0530f9-5f0e-43f5-b6e0-a642a08c943c',
      assignedUserId: 'fd0530f9-5f0e-43f5-b6e0-a642a08c943c',
      deadline: '2026-10-20',
      zaloGroupUrl: 'https://zalo.me/g/example',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects null for required ids, bad dates, and bad Zalo URLs', async () => {
    const { errors } = await parse({
      customerId: null,
      serviceId: null,
      submitterUserId: null,
      deadline: '20-10-2026',
      zaloGroupUrl: 'not-a-url',
    });
    const fields = errors.map((e) => e.property).sort();
    expect(fields).toEqual(
      [
        'customerId',
        'deadline',
        'serviceId',
        'submitterUserId',
        'zaloGroupUrl',
      ].sort(),
    );
  });

  it('rejects an oversized Zalo URL', async () => {
    const { errors } = await parse({
      zaloGroupUrl: `https://zalo.me/${'a'.repeat(500)}`,
    });
    expect(errors.map((e) => e.property)).toContain('zaloGroupUrl');
  });
});
