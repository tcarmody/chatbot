// API Key management for widget embedding
import { sql, initializeSchema } from './db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface ApiKey {
  id: number;
  keyId: string;
  name: string;
  createdBy: number | null;
  createdByEmail?: string;
  isActive: boolean;
  requestsToday: number;
  tokensToday: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// Generate a cryptographically secure random string
function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

// Create a new API key (returns full key only once)
export async function createApiKey(
  name: string,
  createdBy: number
): Promise<{ keyId: string; fullKey: string }> {
  await initializeSchema();

  // Generate key parts
  const keyId = `ak_${generateSecureToken(8)}`; // Public identifier
  const secret = generateSecureToken(32); // Secret part
  const fullKey = `${keyId}.${secret}`; // Full key shown once

  // Hash the full key for storage
  const keyHash = await bcrypt.hash(fullKey, 10);

  await sql`
    INSERT INTO api_keys (key_id, key_hash, name, created_by)
    VALUES (${keyId}, ${keyHash}, ${name}, ${createdBy})
  `;

  return { keyId, fullKey };
}

// Validate an API key from request header
export async function validateApiKey(fullKey: string): Promise<{
  valid: boolean;
  keyId: string | null;
  name: string | null;
}> {
  await initializeSchema();

  // Extract key_id from the full key (format: ak_xxxx.secret)
  const keyIdMatch = fullKey.match(/^(ak_[a-zA-Z0-9_-]+)\./);
  if (!keyIdMatch) {
    return { valid: false, keyId: null, name: null };
  }

  const keyId = keyIdMatch[1];

  // Look up the key
  const result = await sql`
    SELECT key_id, key_hash, name, is_active
    FROM api_keys
    WHERE key_id = ${keyId}
  `;

  if (result.length === 0) {
    return { valid: false, keyId: null, name: null };
  }

  const key = result[0] as { key_id: string; key_hash: string; name: string; is_active: boolean };

  // Check if key is active
  if (!key.is_active) {
    return { valid: false, keyId: null, name: null };
  }

  // Verify the hash
  const isValid = await bcrypt.compare(fullKey, key.key_hash);
  if (!isValid) {
    return { valid: false, keyId: null, name: null };
  }

  // Update last_used_at
  sql`
    UPDATE api_keys
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE key_id = ${keyId}
  `.catch(() => {}); // Non-blocking update

  return {
    valid: true,
    keyId: key.key_id,
    name: key.name,
  };
}

// List all API keys (for admin UI)
export async function listApiKeys(): Promise<ApiKey[]> {
  await initializeSchema();

  const result = await sql`
    SELECT
      ak.id,
      ak.key_id,
      ak.name,
      ak.created_by,
      au.email as created_by_email,
      ak.is_active,
      ak.requests_today,
      ak.tokens_today,
      ak.last_used_at,
      ak.created_at
    FROM api_keys ak
    LEFT JOIN admin_users au ON ak.created_by = au.id
    ORDER BY ak.created_at DESC
  `;

  return (result as Array<{
    id: number;
    key_id: string;
    name: string;
    created_by: number | null;
    created_by_email: string | null;
    is_active: boolean;
    requests_today: number;
    tokens_today: number;
    last_used_at: string | null;
    created_at: string;
  }>).map(row => ({
    id: row.id,
    keyId: row.key_id,
    name: row.name,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email || undefined,
    isActive: row.is_active,
    requestsToday: row.requests_today,
    tokensToday: row.tokens_today,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    createdAt: new Date(row.created_at),
  }));
}

// Revoke an API key
export async function revokeApiKey(keyId: string): Promise<boolean> {
  await initializeSchema();

  const result = await sql`
    UPDATE api_keys
    SET is_active = false
    WHERE key_id = ${keyId}
    RETURNING id
  `;

  return result.length > 0;
}

// Delete an API key permanently
export async function deleteApiKey(keyId: string): Promise<boolean> {
  await initializeSchema();

  const result = await sql`
    DELETE FROM api_keys
    WHERE key_id = ${keyId}
    RETURNING id
  `;

  return result.length > 0;
}

// Update API key usage stats (called after each request)
export async function updateApiKeyUsage(keyId: string, tokens: number): Promise<void> {
  await initializeSchema();

  await sql`
    UPDATE api_keys
    SET
      requests_today = requests_today + 1,
      tokens_today = tokens_today + ${tokens},
      last_used_at = CURRENT_TIMESTAMP
    WHERE key_id = ${keyId}
  `;
}

// Reset daily counters (should be called by a cron job at midnight UTC)
export async function resetDailyApiKeyCounters(): Promise<void> {
  await initializeSchema();

  await sql`
    UPDATE api_keys
    SET requests_today = 0, tokens_today = 0
  `;
}
