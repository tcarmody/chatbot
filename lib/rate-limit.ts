import { NextResponse } from 'next/server';
import { sql, initializeSchema } from './db';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Abuse detection entry (rapid requests tracking)
interface AbuseEntry {
  timestamps: number[];
  cooldownUntil: number | null;
}

// In-memory store for rate limiting
// Note: In a multi-instance deployment, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// In-memory store for abuse detection (rapid request tracking)
const abuseStore = new Map<string, AbuseEntry>();

// Rate control limits
export const LIMITS = {
  DAILY_TOKEN_BUDGET: 50_000,
  MAX_CONVERSATION_LENGTH: 30,
  RAPID_REQUEST_THRESHOLD: 10,  // requests in window triggers cooldown
  RAPID_REQUEST_WINDOW: 10_000, // 10 seconds
  COOLDOWN_DURATION: 60_000,    // 1 minute cooldown
} as const;

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

// ============================================
// Token Budget Functions (Database-backed)
// ============================================

export interface TokenBudgetResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetsAt: Date;
}

// Get the start of the next day in UTC
function getNextMidnightUTC(): Date {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow;
}

// Get today's date as YYYY-MM-DD in UTC
function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Check if identifier has remaining token budget for today
export async function checkTokenBudget(
  identifier: string,
  identifierType: 'ip' | 'api_key'
): Promise<TokenBudgetResult> {
  await initializeSchema();

  const today = getTodayUTC();
  const resetsAt = getNextMidnightUTC();

  const result = await sql`
    SELECT tokens_used
    FROM daily_token_usage
    WHERE identifier = ${identifier}
      AND identifier_type = ${identifierType}
      AND date = ${today}::date
  `;

  const used = result.length > 0 ? (result[0] as { tokens_used: number }).tokens_used : 0;
  const allowed = used < LIMITS.DAILY_TOKEN_BUDGET;

  return {
    allowed,
    used,
    limit: LIMITS.DAILY_TOKEN_BUDGET,
    resetsAt,
  };
}

// Record token usage after a successful request
export async function recordTokenUsage(
  identifier: string,
  identifierType: 'ip' | 'api_key',
  tokens: number
): Promise<void> {
  await initializeSchema();

  const today = getTodayUTC();

  await sql`
    INSERT INTO daily_token_usage (identifier, identifier_type, date, tokens_used, request_count, last_request_at)
    VALUES (${identifier}, ${identifierType}, ${today}::date, ${tokens}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (identifier, identifier_type, date)
    DO UPDATE SET
      tokens_used = daily_token_usage.tokens_used + ${tokens},
      request_count = daily_token_usage.request_count + 1,
      last_request_at = CURRENT_TIMESTAMP
  `;
}

// ============================================
// Conversation Length Check
// ============================================

export interface ConversationCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
}

export function checkConversationLength(
  conversationHistory: Array<{ role: string; content: string }>
): ConversationCheckResult {
  const current = conversationHistory.length;
  const allowed = current < LIMITS.MAX_CONVERSATION_LENGTH;

  return {
    allowed,
    current,
    limit: LIMITS.MAX_CONVERSATION_LENGTH,
  };
}

// ============================================
// Abuse Threshold Detection (Rapid Requests)
// ============================================

export interface AbuseCheckResult {
  triggered: boolean;
  reason: 'rapid_requests' | null;
  cooldownUntil: Date | null;
}

export function checkAbuseThreshold(identifier: string): AbuseCheckResult {
  const now = Date.now();
  const key = `abuse:${identifier}`;

  let entry = abuseStore.get(key);

  // Initialize entry if doesn't exist
  if (!entry) {
    entry = { timestamps: [], cooldownUntil: null };
    abuseStore.set(key, entry);
  }

  // Check if in cooldown
  if (entry.cooldownUntil && now < entry.cooldownUntil) {
    return {
      triggered: true,
      reason: 'rapid_requests',
      cooldownUntil: new Date(entry.cooldownUntil),
    };
  }

  // Clear cooldown if expired
  if (entry.cooldownUntil && now >= entry.cooldownUntil) {
    entry.cooldownUntil = null;
    entry.timestamps = [];
  }

  // Remove timestamps outside the window
  const windowStart = now - LIMITS.RAPID_REQUEST_WINDOW;
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  // Add current timestamp
  entry.timestamps.push(now);

  // Check if threshold exceeded
  if (entry.timestamps.length >= LIMITS.RAPID_REQUEST_THRESHOLD) {
    entry.cooldownUntil = now + LIMITS.COOLDOWN_DURATION;
    return {
      triggered: true,
      reason: 'rapid_requests',
      cooldownUntil: new Date(entry.cooldownUntil),
    };
  }

  return {
    triggered: false,
    reason: null,
    cooldownUntil: null,
  };
}

// Clean up old abuse entries periodically
export function cleanupAbuseStore(): void {
  const now = Date.now();
  const maxAge = LIMITS.RAPID_REQUEST_WINDOW + LIMITS.COOLDOWN_DURATION;

  for (const [key, entry] of abuseStore.entries()) {
    // Remove entries with no recent activity and no active cooldown
    const lastActivity = Math.max(...entry.timestamps, 0);
    if (now - lastActivity > maxAge && (!entry.cooldownUntil || now > entry.cooldownUntil)) {
      abuseStore.delete(key);
    }
  }
}

// ============================================
// Rate Limit Event Logging
// ============================================

export type RateLimitEventType =
  | 'rate_limit_exceeded'
  | 'token_budget_exceeded'
  | 'conversation_limit'
  | 'abuse_threshold'
  | 'invalid_api_key';

export interface RateLimitEventDetails {
  limit?: number;
  used?: number;
  resetTime?: string;
  cooldownUntil?: string;
  conversationLength?: number;
  [key: string]: unknown;
}

// Log a rate limit event to the database (non-blocking)
export async function logRateLimitEvent(
  identifier: string,
  identifierType: 'ip' | 'api_key',
  eventType: RateLimitEventType,
  details?: RateLimitEventDetails
): Promise<void> {
  try {
    await initializeSchema();
    await sql`
      INSERT INTO rate_limit_events (identifier, identifier_type, event_type, details)
      VALUES (${identifier}, ${identifierType}, ${eventType}, ${JSON.stringify(details || {})})
    `;
  } catch (error) {
    // Fail silently - logging shouldn't break the request
    console.error('Failed to log rate limit event:', error);
  }
}

// Get rate limit event statistics
export async function getRateLimitStats(hours: number = 24): Promise<{
  totalEvents: number;
  byType: { type: string; count: number }[];
  topIdentifiers: { identifier: string; type: string; count: number }[];
  recentEvents: Array<{
    identifier: string;
    identifierType: string;
    eventType: string;
    details: RateLimitEventDetails;
    createdAt: string;
  }>;
}> {
  await initializeSchema();

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Total events
  const totalResult = await sql`
    SELECT COUNT(*) as count FROM rate_limit_events WHERE created_at > ${cutoff}
  `;
  const totalEvents = Number((totalResult[0] as { count: string })?.count || 0);

  // Events by type
  const byTypeResult = await sql`
    SELECT event_type as type, COUNT(*) as count
    FROM rate_limit_events
    WHERE created_at > ${cutoff}
    GROUP BY event_type
    ORDER BY count DESC
  `;
  const byType = (byTypeResult as { type: string; count: string }[]).map(row => ({
    type: row.type,
    count: Number(row.count),
  }));

  // Top identifiers (most blocked)
  const topIdentifiersResult = await sql`
    SELECT identifier, identifier_type as type, COUNT(*) as count
    FROM rate_limit_events
    WHERE created_at > ${cutoff}
    GROUP BY identifier, identifier_type
    ORDER BY count DESC
    LIMIT 10
  `;
  const topIdentifiers = (topIdentifiersResult as { identifier: string; type: string; count: string }[]).map(row => ({
    identifier: row.identifier,
    type: row.type,
    count: Number(row.count),
  }));

  // Recent events
  const recentResult = await sql`
    SELECT identifier, identifier_type, event_type, details, created_at
    FROM rate_limit_events
    WHERE created_at > ${cutoff}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  const recentEvents = (recentResult as Array<{
    identifier: string;
    identifier_type: string;
    event_type: string;
    details: string;
    created_at: string;
  }>).map(row => ({
    identifier: row.identifier,
    identifierType: row.identifier_type,
    eventType: row.event_type,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
    createdAt: row.created_at,
  }));

  return {
    totalEvents,
    byType,
    topIdentifiers,
    recentEvents,
  };
}
