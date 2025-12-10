import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

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

const DB_PATH = path.join(process.cwd(), 'data', 'analytics.db');

// Initialize database and create admin tables
function getDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Create admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'support',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Create admin sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES admin_users(id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
    CREATE INDEX IF NOT EXISTS idx_admin_active ON admin_users(is_active);
    CREATE INDEX IF NOT EXISTS idx_session_token ON admin_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_session_expires ON admin_sessions(expires_at);
  `);

  return db;
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
    const db = getDatabase();
    const passwordHash = await hashPassword(user.password);

    const stmt = db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      user.email.toLowerCase(),
      passwordHash,
      user.name,
      user.role || 'support'
    );

    db.close();
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw new Error('Failed to create admin user');
  }
}

// Get admin user by email
export function getAdminUserByEmail(email: string): AdminUser | null {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT id, email, password_hash, name, role, is_active, created_at, last_login
      FROM admin_users
      WHERE email = ? AND is_active = 1
    `);

    const user = stmt.get(email.toLowerCase()) as AdminUser | undefined;
    db.close();

    return user || null;
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

// Get admin user by ID
export function getAdminUserById(id: number): AdminUser | null {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT id, email, name, role, is_active, created_at, last_login
      FROM admin_users
      WHERE id = ? AND is_active = 1
    `);

    const user = stmt.get(id) as AdminUser | undefined;
    db.close();

    return user || null;
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

// Authenticate admin user
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const user = getAdminUserByEmail(email);

  if (!user || !user.password_hash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Update last login
  try {
    const db = getDatabase();
    db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    db.close();
  } catch (error) {
    console.error('Error updating last login:', error);
  }

  // Remove password hash from returned user
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Create session
export function createSession(userId: number): { sessionToken: string; expiresAt: Date } {
  try {
    const db = getDatabase();
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const stmt = db.prepare(`
      INSERT INTO admin_sessions (user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, sessionToken, expiresAt.toISOString());
    db.close();

    return { sessionToken, expiresAt };
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
}

// Validate session
export function validateSession(sessionToken: string): AdminUser | null {
  try {
    const db = getDatabase();

    // Get session and join with user
    const stmt = db.prepare(`
      SELECT
        u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.last_login
      FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND s.expires_at > datetime('now')
        AND u.is_active = 1
    `);

    const user = stmt.get(sessionToken) as AdminUser | undefined;
    db.close();

    return user || null;
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

// Delete session (logout)
export function deleteSession(sessionToken: string): boolean {
  try {
    const db = getDatabase();

    const stmt = db.prepare('DELETE FROM admin_sessions WHERE session_token = ?');
    const result = stmt.run(sessionToken);
    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Clean up expired sessions
export function cleanupExpiredSessions(): number {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now')`);
    const result = stmt.run();
    db.close();

    return result.changes;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }
}

// Get all admin users (for admin management)
export function getAllAdminUsers(): Omit<AdminUser, 'password_hash'>[] {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT id, email, name, role, is_active, created_at, last_login
      FROM admin_users
      ORDER BY created_at DESC
    `);

    const users = stmt.all() as Omit<AdminUser, 'password_hash'>[];
    db.close();

    return users;
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
    const db = getDatabase();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }

    if (updates.email) {
      setClauses.push('email = ?');
      values.push(updates.email.toLowerCase());
    }

    if (updates.password) {
      const passwordHash = await hashPassword(updates.password);
      setClauses.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.role) {
      setClauses.push('role = ?');
      values.push(updates.role);
    }

    if (typeof updates.is_active === 'boolean') {
      setClauses.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (setClauses.length === 0) {
      db.close();
      return false;
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE admin_users
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error updating admin user:', error);
    return false;
  }
}

// Delete admin user
export function deleteAdminUser(id: number): boolean {
  try {
    const db = getDatabase();

    // Soft delete by setting is_active to 0
    const stmt = db.prepare('UPDATE admin_users SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);

    // Also delete all sessions for this user
    db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(id);

    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return false;
  }
}
