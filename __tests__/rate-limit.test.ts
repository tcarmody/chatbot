import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  describe('checkRateLimit', () => {
    const testConfig = {
      windowMs: 1000, // 1 second window for testing
      maxRequests: 3,
      keyPrefix: 'test',
    };

    it('should allow requests under the limit', () => {
      const result = checkRateLimit('test-ip-1', testConfig);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should track remaining requests correctly', () => {
      const ip = 'test-ip-2';

      const first = checkRateLimit(ip, testConfig);
      expect(first.remaining).toBe(2);

      const second = checkRateLimit(ip, testConfig);
      expect(second.remaining).toBe(1);

      const third = checkRateLimit(ip, testConfig);
      expect(third.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      const ip = 'test-ip-3';

      // Use up all requests
      checkRateLimit(ip, testConfig);
      checkRateLimit(ip, testConfig);
      checkRateLimit(ip, testConfig);

      // This should be blocked
      const result = checkRateLimit(ip, testConfig);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should include reset time in response', () => {
      const result = checkRateLimit('test-ip-4', testConfig);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });
      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('should return unknown when no IP headers present', () => {
      const request = new Request('http://localhost');
      expect(getClientIP(request)).toBe('unknown');
    });
  });

  describe('RATE_LIMITS config', () => {
    it('should have chat rate limit configured', () => {
      expect(RATE_LIMITS.chat).toBeDefined();
      expect(RATE_LIMITS.chat.maxRequests).toBe(20);
      expect(RATE_LIMITS.chat.windowMs).toBe(60000);
    });

    it('should have admin login rate limit configured for brute force protection', () => {
      expect(RATE_LIMITS.adminLogin).toBeDefined();
      expect(RATE_LIMITS.adminLogin.maxRequests).toBe(5);
      expect(RATE_LIMITS.adminLogin.windowMs).toBe(900000); // 15 minutes
    });
  });
});
