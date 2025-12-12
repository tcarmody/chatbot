// Audit logging using Vercel Postgres
import { sql, initializeSchema } from './db';

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

// Log an action
export async function logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<number> {
  try {
    await initializeSchema();

    const result = await sql`
      INSERT INTO audit_logs (
        user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent
      ) VALUES (
        ${log.user_id},
        ${log.user_email},
        ${log.action},
        ${log.resource_type},
        ${log.resource_id || null},
        ${log.details || null},
        ${log.ip_address || null},
        ${log.user_agent || null}
      )
      RETURNING id
    `;

    return result.rows[0]?.id || 0;
  } catch (error) {
    console.error('Error logging audit:', error);
    return 0;
  }
}

// Get audit logs with filters
export async function getAuditLogs(filters?: {
  user_id?: number;
  action?: string;
  resource_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    await initializeSchema();

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Build query based on filters
    let logs: AuditLog[] = [];
    let total = 0;

    if (filters?.user_id && filters?.action && filters?.resource_type) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = ${filters.user_id} AND action = ${filters.action} AND resource_type = ${filters.resource_type}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs
        WHERE user_id = ${filters.user_id} AND action = ${filters.action} AND resource_type = ${filters.resource_type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.user_id && filters?.action) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = ${filters.user_id} AND action = ${filters.action}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs
        WHERE user_id = ${filters.user_id} AND action = ${filters.action}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.user_id && filters?.resource_type) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = ${filters.user_id} AND resource_type = ${filters.resource_type}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs
        WHERE user_id = ${filters.user_id} AND resource_type = ${filters.resource_type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.action && filters?.resource_type) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE action = ${filters.action} AND resource_type = ${filters.resource_type}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs
        WHERE action = ${filters.action} AND resource_type = ${filters.resource_type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.user_id) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ${filters.user_id}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs WHERE user_id = ${filters.user_id}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.action) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs WHERE action = ${filters.action}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs WHERE action = ${filters.action}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else if (filters?.resource_type) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM audit_logs WHERE resource_type = ${filters.resource_type}
      `;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs WHERE resource_type = ${filters.resource_type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    } else {
      const countResult = await sql`SELECT COUNT(*) as count FROM audit_logs`;
      total = Number(countResult.rows[0]?.count || 0);

      const logsResult = await sql`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      logs = logsResult.rows.map(mapAuditRow);
    }

    return { logs, total };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
}

// Helper to map database row to AuditLog
function mapAuditRow(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    user_email: row.user_email as string,
    action: row.action as string,
    resource_type: row.resource_type as string,
    resource_id: row.resource_id as string | undefined,
    details: row.details as string | undefined,
    ip_address: row.ip_address as string | undefined,
    user_agent: row.user_agent as string | undefined,
    created_at: (row.created_at as Date)?.toISOString(),
  };
}

// Get recent activity for a user
export async function getUserRecentActivity(userId: number, limit: number = 10): Promise<AuditLog[]> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT * FROM audit_logs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result.rows.map(mapAuditRow);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
}

// Get audit statistics
export async function getAuditStats(): Promise<{
  total_actions: number;
  actions_today: number;
  top_actions: { action: string; count: number }[];
  active_users_today: number;
}> {
  try {
    await initializeSchema();

    // Total actions
    const totalResult = await sql`SELECT COUNT(*) as count FROM audit_logs`;
    const total_actions = Number(totalResult.rows[0]?.count || 0);

    // Actions today
    const todayResult = await sql`
      SELECT COUNT(*) as count FROM audit_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const actions_today = Number(todayResult.rows[0]?.count || 0);

    // Top actions
    const topActionsResult = await sql`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 5
    `;
    const top_actions = topActionsResult.rows.map(row => ({
      action: row.action as string,
      count: Number(row.count),
    }));

    // Active users today
    const activeUsersResult = await sql`
      SELECT COUNT(DISTINCT user_id) as count
      FROM audit_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const active_users_today = Number(activeUsersResult.rows[0]?.count || 0);

    return {
      total_actions,
      actions_today,
      top_actions,
      active_users_today,
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
