import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Ticket {
  id?: number;
  ticket_number: string;
  user_email: string;
  user_name?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  conversation_context?: string; // JSON string of chat history if ticket created from chat
  created_at?: string;
  updated_at?: string;
}

const DB_PATH = path.join(process.cwd(), 'data', 'analytics.db');

// Initialize database and create tickets table if needed
function getDatabase() {
  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Create tickets table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT,
      conversation_context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ticket_number ON support_tickets(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_user_email ON support_tickets(user_email);
    CREATE INDEX IF NOT EXISTS idx_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_created_at ON support_tickets(created_at);
  `);

  return db;
}

// Generate a unique ticket number (format: TICK-YYYYMMDD-XXXX)
function generateTicketNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TICK-${dateStr}-${random}`;
}

// Create a new support ticket
export function createTicket(ticket: Omit<Ticket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>): string {
  try {
    const db = getDatabase();
    const ticketNumber = generateTicketNumber();

    const stmt = db.prepare(`
      INSERT INTO support_tickets (
        ticket_number, user_email, user_name, subject, description,
        status, priority, category, conversation_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ticketNumber,
      ticket.user_email,
      ticket.user_name || null,
      ticket.subject,
      ticket.description,
      ticket.status || 'open',
      ticket.priority || 'medium',
      ticket.category || null,
      ticket.conversation_context || null
    );

    db.close();
    return ticketNumber;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw new Error('Failed to create support ticket');
  }
}

// Get ticket by ticket number
export function getTicketByNumber(ticketNumber: string): Ticket | null {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM support_tickets WHERE ticket_number = ?
    `);

    const ticket = stmt.get(ticketNumber) as Ticket | undefined;
    db.close();

    return ticket || null;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
}

// Get all tickets for a user by email
export function getTicketsByEmail(email: string): Ticket[] {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM support_tickets
      WHERE user_email = ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(email) as Ticket[];
    db.close();

    return tickets;
  } catch (error) {
    console.error('Error fetching tickets by email:', error);
    return [];
  }
}

// Update ticket status
export function updateTicketStatus(
  ticketNumber: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): boolean {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE support_tickets
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ticket_number = ?
    `);

    const result = stmt.run(status, ticketNumber);
    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return false;
  }
}

// Get all tickets (for admin view)
export function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}): { tickets: Ticket[]; total: number } {
  try {
    const db = getDatabase();

    let whereClause = '';
    const params: any[] = [];

    if (filters?.status) {
      whereClause += ' WHERE status = ?';
      params.push(filters.status);
    }

    if (filters?.priority) {
      whereClause += whereClause ? ' AND priority = ?' : ' WHERE priority = ?';
      params.push(filters.priority);
    }

    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM support_tickets${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get tickets with pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const ticketsStmt = db.prepare(`
      SELECT * FROM support_tickets${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const tickets = ticketsStmt.all(...params, limit, offset) as Ticket[];
    db.close();

    return { tickets, total };
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return { tickets: [], total: 0 };
  }
}

// Get ticket statistics
export function getTicketStats(): {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  by_priority: { low: number; medium: number; high: number };
} {
  try {
    const db = getDatabase();

    // Total tickets
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets').get() as { count: number };

    // By status
    const openResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE status = ?').get('open') as { count: number };
    const inProgressResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE status = ?').get('in_progress') as { count: number };
    const resolvedResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE status = ?').get('resolved') as { count: number };
    const closedResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE status = ?').get('closed') as { count: number };

    // By priority
    const lowPriorityResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE priority = ?').get('low') as { count: number };
    const mediumPriorityResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE priority = ?').get('medium') as { count: number };
    const highPriorityResult = db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE priority = ?').get('high') as { count: number };

    db.close();

    return {
      total: totalResult.count,
      open: openResult.count,
      in_progress: inProgressResult.count,
      resolved: resolvedResult.count,
      closed: closedResult.count,
      by_priority: {
        low: lowPriorityResult.count,
        medium: mediumPriorityResult.count,
        high: highPriorityResult.count,
      },
    };
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    return {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      by_priority: { low: 0, medium: 0, high: 0 },
    };
  }
}
