// Admin authentication using Neon Postgres
import bcrypt from 'bcryptjs';
import { sql, initializeSchema } from './db';

export interface AdminUser {
  id?: number;
  email: string;
  password_hash?: string;
  name: string;
  role: 'admin' | 'support';
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AdminSession {
  id?: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at?: string;
}

// Database row types
interface AdminUserRow {
  id: number;
  email: string;
  password_hash?: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  last_login: Date | null;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate session token
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2) +
         Date.now().toString(36);
}

// Create admin user
export async function createAdminUser(user: {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'support';
}): Promise<number> {
  try {
    await initializeSchema();
    const passwordHash = await hashPassword(user.password);

    const result = await sql`
      INSERT INTO admin_users (email, password_hash, name, role, is_active)
      VALUES (${user.email.toLowerCase()}, ${passwordHash}, ${user.name}, ${user.role || 'support'}, true)
      RETURNING id
    `;

    return (result[0] as { id: number }).id;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw new Error('Failed to create admin user');
  }
}

// Get admin user by email
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT id, email, password_hash, name, role, is_active, created_at, last_login
      FROM admin_users
      WHERE email = ${email.toLowerCase()} AND is_active = true
    `;

    if (result.length === 0) return null;

    const row = result[0] as AdminUserRow;
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      role: row.role as 'admin' | 'support',
      is_active: row.is_active,
      created_at: row.created_at?.toISOString(),
      last_login: row.last_login?.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

// Get admin user by ID
export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT id, email, name, role, is_active, created_at, last_login
      FROM admin_users
      WHERE id = ${id} AND is_active = true
    `;

    if (result.length === 0) return null;

    const row = result[0] as AdminUserRow;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as 'admin' | 'support',
      is_active: row.is_active,
      created_at: row.created_at?.toISOString(),
      last_login: row.last_login?.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

// Authenticate admin user
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const user = await getAdminUserByEmail(email);

  if (!user || !user.password_hash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Update last login
  try {
    await sql`UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ${user.id}`;
  } catch (error) {
    console.error('Error updating last login:', error);
  }

  // Remove password hash from returned user
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Create session
export async function createSession(userId: number): Promise<{ sessionToken: string; expiresAt: Date }> {
  try {
    await initializeSchema();
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await sql`
      INSERT INTO admin_sessions (user_id, session_token, expires_at)
      VALUES (${userId}, ${sessionToken}, ${expiresAt.toISOString()})
    `;

    return { sessionToken, expiresAt };
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
}

// Validate session
export async function validateSession(sessionToken: string): Promise<AdminUser | null> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT
        u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.last_login
      FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.session_token = ${sessionToken}
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.is_active = true
    `;

    if (result.length === 0) return null;

    const row = result[0] as AdminUserRow;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as 'admin' | 'support',
      is_active: row.is_active,
      created_at: row.created_at?.toISOString(),
      last_login: row.last_login?.toISOString(),
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

// Delete session (logout)
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    await initializeSchema();

    await sql`
      DELETE FROM admin_sessions WHERE session_token = ${sessionToken}
    `;

    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    await initializeSchema();

    await sql`
      DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP
    `;

    return 0; // Neon doesn't return rowCount easily
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }
}

// Get all admin users (for admin management)
export async function getAllAdminUsers(): Promise<Omit<AdminUser, 'password_hash'>[]> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT id, email, name, role, is_active, created_at, last_login
      FROM admin_users
      ORDER BY created_at DESC
    `;

    return (result as AdminUserRow[]).map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as 'admin' | 'support',
      is_active: row.is_active,
      created_at: row.created_at?.toISOString(),
      last_login: row.last_login?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

// Update admin user
export async function updateAdminUser(id: number, updates: {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'support';
  is_active?: boolean;
}): Promise<boolean> {
  try {
    await initializeSchema();

    // Build dynamic update - Postgres doesn't support dynamic columns easily
    // So we update all fields, using COALESCE to keep existing values
    let passwordHash: string | null = null;
    if (updates.password) {
      passwordHash = await hashPassword(updates.password);
    }

    await sql`
      UPDATE admin_users
      SET
        name = COALESCE(${updates.name ?? null}, name),
        email = COALESCE(${updates.email?.toLowerCase() ?? null}, email),
        password_hash = COALESCE(${passwordHash}, password_hash),
        role = COALESCE(${updates.role ?? null}, role),
        is_active = COALESCE(${updates.is_active ?? null}, is_active)
      WHERE id = ${id}
    `;

    return true;
  } catch (error) {
    console.error('Error updating admin user:', error);
    return false;
  }
}

// Delete admin user (soft delete)
export async function deleteAdminUser(id: number): Promise<boolean> {
  try {
    await initializeSchema();

    // Soft delete by setting is_active to false
    await sql`UPDATE admin_users SET is_active = false WHERE id = ${id}`;

    // Also delete all sessions for this user
    await sql`DELETE FROM admin_sessions WHERE user_id = ${id}`;

    return true;
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return false;
  }
}

// Get all active sessions
export async function getAllSessions(): Promise<Array<{
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}>> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT
        s.id, s.user_id, s.session_token, s.expires_at, s.created_at,
        u.email as user_email, u.name as user_name
      FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.expires_at > CURRENT_TIMESTAMP
      ORDER BY s.created_at DESC
    `;

    return (result as Array<{
      id: number;
      user_id: number;
      user_email: string;
      user_name: string;
      session_token: string;
      expires_at: Date;
      created_at: Date;
    }>).map(row => ({
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      session_token: row.session_token,
      expires_at: row.expires_at?.toISOString(),
      created_at: row.created_at?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

// Get sessions for a specific user
export async function getUserSessions(userId: number): Promise<Array<{
  id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
}>> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT id, session_token, expires_at, created_at
      FROM admin_sessions
      WHERE user_id = ${userId} AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `;

    return (result as Array<{
      id: number;
      session_token: string;
      expires_at: Date;
      created_at: Date;
    }>).map(row => ({
      id: row.id,
      session_token: row.session_token,
      expires_at: row.expires_at?.toISOString(),
      created_at: row.created_at?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
}

// Delete session by ID (for force logout)
export async function deleteSessionById(id: number): Promise<boolean> {
  try {
    await initializeSchema();

    await sql`DELETE FROM admin_sessions WHERE id = ${id}`;

    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Delete all sessions for a user
export async function deleteAllUserSessions(userId: number): Promise<number> {
  try {
    await initializeSchema();

    await sql`DELETE FROM admin_sessions WHERE user_id = ${userId}`;

    return 0; // Neon doesn't return rowCount easily
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return 0;
  }
}

// Generate password reset token
export async function createPasswordResetToken(email: string): Promise<string | null> {
  try {
    const user = await getAdminUserByEmail(email);
    if (!user || !user.id) {
      return null;
    }

    await initializeSchema();

    // Generate token
    const token = Math.random().toString(36).substring(2) +
                  Math.random().toString(36).substring(2) +
                  Date.now().toString(36);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    return token;
  } catch (error) {
    console.error('Error creating reset token:', error);
    return null;
  }
}

// Validate and use password reset token
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  try {
    await initializeSchema();

    // Find valid token
    const tokenResult = await sql`
      SELECT user_id FROM password_reset_tokens
      WHERE token = ${token}
        AND expires_at > CURRENT_TIMESTAMP
        AND used = false
    `;

    if (tokenResult.length === 0) {
      return false;
    }

    const userId = (tokenResult[0] as { user_id: number }).user_id;

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await sql`UPDATE admin_users SET password_hash = ${passwordHash} WHERE id = ${userId}`;

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = true WHERE token = ${token}`;

    // Delete all sessions for this user (force re-login)
    await sql`DELETE FROM admin_sessions WHERE user_id = ${userId}`;

    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
}
