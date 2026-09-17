import { describe, expect, it } from 'vitest';
import { errorEnvelope } from '@ptt/shared-kernel';

describe('admin-api envelope', () => {
  it('builds standard error body', () => {
    const body = errorEnvelope('TENANT_REQUIRED', 'tenant_id is required', {
      correlationId: 'cor_1',
    });
    expect(body.error.code).toBe('TENANT_REQUIRED');
    expect(body.error.correlation_id).toBe('cor_1');
  });
});
