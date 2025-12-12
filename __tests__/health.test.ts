import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return healthy status when all checks pass', async () => {
    // Mock environment
    process.env.ANTHROPIC_API_KEY = 'test_key';
    process.env.HUBSPOT_ACCESS_TOKEN = 'test_token';

    // Mock better-sqlite3
    vi.doMock('better-sqlite3', () => ({
      default: vi.fn().mockImplementation(() => ({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ 1: 1 }),
        }),
        close: vi.fn(),
      })),
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.anthropic).toBe('ok');
    expect(data.checks.hubspot).toBe('ok');
  });

  it('should return degraded status when HubSpot token is missing', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_key';
    delete process.env.HUBSPOT_ACCESS_TOKEN;

    vi.doMock('better-sqlite3', () => ({
      default: vi.fn().mockImplementation(() => ({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ 1: 1 }),
        }),
        close: vi.fn(),
      })),
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('degraded');
    expect(data.checks.hubspot).toBe('missing');
  });

  it('should include uptime in response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test_key';
    process.env.HUBSPOT_ACCESS_TOKEN = 'test_token';

    vi.doMock('better-sqlite3', () => ({
      default: vi.fn().mockImplementation(() => ({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ 1: 1 }),
        }),
        close: vi.fn(),
      })),
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe('number');
  });
});
