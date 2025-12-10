import Database from 'better-sqlite3';
import path from 'path';

export interface AuditLog {
  id?: number;
  user_id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

const DB_PATH = path.join(process.cwd(), 'data', 'analytics.db');

// Initialize audit log table
function getDatabase() {
  const db = new Database(DB_PATH);

  // Create audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES admin_users(id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  return db;
}

// Log an action
export function logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): number {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      log.user_id,
      log.user_email,
      log.action,
      log.resource_type,
      log.resource_id || null,
      log.details || null,
      log.ip_address || null,
      log.user_agent || null
    );

    db.close();
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error logging audit:', error);
    return 0;
  }
}

// Get audit logs with filters
export function getAuditLogs(filters?: {
  user_id?: number;
  action?: string;
  resource_type?: string;
  limit?: number;
  offset?: number;
}): { logs: AuditLog[]; total: number } {
  try {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.user_id) {
      whereClauses.push('user_id = ?');
      params.push(filters.user_id);
    }

    if (filters?.action) {
      whereClauses.push('action = ?');
      params.push(filters.action);
    }

    if (filters?.resource_type) {
      whereClauses.push('resource_type = ?');
      params.push(filters.resource_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get logs with pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const logsStmt = db.prepare(`
      SELECT * FROM audit_logs ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const logs = logsStmt.all(...params, limit, offset) as AuditLog[];
    db.close();

    return { logs, total };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
}

// Get recent activity for a user
export function getUserRecentActivity(userId: number, limit: number = 10): AuditLog[] {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const logs = stmt.all(userId, limit) as AuditLog[];
    db.close();

    return logs;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
}

// Get audit statistics
export function getAuditStats(): {
  total_actions: number;
  actions_today: number;
  top_actions: { action: string; count: number }[];
  active_users_today: number;
} {
  try {
    const db = getDatabase();

    // Total actions
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };

    // Actions today
    const todayResult = db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs
      WHERE DATE(created_at) = DATE('now')
    `).get() as { count: number };

    // Top actions
    const topActionsResult = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 5
    `).all() as { action: string; count: number }[];

    // Active users today
    const activeUsersResult = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM audit_logs
      WHERE DATE(created_at) = DATE('now')
    `).get() as { count: number };

    db.close();

    return {
      total_actions: totalResult.count,
      actions_today: todayResult.count,
      top_actions: topActionsResult,
      active_users_today: activeUsersResult.count,
    };
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return {
      total_actions: 0,
      actions_today: 0,
      top_actions: [],
      active_users_today: 0,
    };
  }
}
