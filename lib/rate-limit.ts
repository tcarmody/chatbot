import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: In a multi-instance deployment, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyPrefix?: string;  // Prefix for the rate limit key
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const key = `${config.keyPrefix || 'rl'}:${identifier}`;
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIP(request: Request): string {
  // Check common headers for real IP (behind proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback - in serverless environments this might be the only option
  return 'unknown';
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

// Pre-configured rate limiters for different use cases
export const RATE_LIMITS = {
  // Chat API: 20 requests per minute per IP
  chat: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'chat',
  },
  // Ticket creation: 5 per minute per IP
  ticketCreate: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ticket-create',
  },
  // Ticket lookup: 30 per minute per IP
  ticketLookup: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'ticket-lookup',
  },
  // Admin login: 5 attempts per 15 minutes per IP (brute force protection)
  adminLogin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'admin-login',
  },
  // Analytics: 60 per minute (high-frequency dashboard updates)
  analytics: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'analytics',
  },
} as const;
