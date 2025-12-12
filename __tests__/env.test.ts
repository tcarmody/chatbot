import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass validation when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_key';

    const { getValidatedEnv } = await import('@/lib/env');
    const env = getValidatedEnv();

    expect(env.ANTHROPIC_API_KEY).toBe('test_key');
  });

  it('should throw error when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { getValidatedEnv } = await import('@/lib/env');

    expect(() => getValidatedEnv()).toThrow('Missing required environment variables');
  });

  it('should use default values for optional env vars', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_key';
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.HUBSPOT_STAGE_OPEN;

    const { getValidatedEnv } = await import('@/lib/env');
    const env = getValidatedEnv();

    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(env.HUBSPOT_STAGE_OPEN).toBe('1');
  });
});
