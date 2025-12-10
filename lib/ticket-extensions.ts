import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { TicketAttachment, TicketComment } from './tickets';

const DB_PATH = path.join(process.cwd(), 'data', 'analytics.db');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Initialize extended database tables
function getDatabase() {
  const db = new Database(DB_PATH);

  // Create attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_number) REFERENCES support_tickets(ticket_number)
    )
  `);

  // Create comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL,
      author_name TEXT,
      author_email TEXT,
      comment_text TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_number) REFERENCES support_tickets(ticket_number)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON ticket_attachments(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_comments_created ON ticket_comments(created_at);
  `);

  return db;
}

// Ensure uploads directory exists
function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Add attachment to ticket
export function addAttachment(attachment: Omit<TicketAttachment, 'id' | 'uploaded_at'>): number {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO ticket_attachments (
        ticket_number, filename, original_name, file_size, mime_type
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      attachment.ticket_number,
      attachment.filename,
      attachment.original_name,
      attachment.file_size,
      attachment.mime_type
    );

    db.close();
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error adding attachment:', error);
    throw new Error('Failed to add attachment');
  }
}

// Get attachments for a ticket
export function getTicketAttachments(ticketNumber: string): TicketAttachment[] {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM ticket_attachments
      WHERE ticket_number = ?
      ORDER BY uploaded_at DESC
    `);

    const attachments = stmt.all(ticketNumber) as TicketAttachment[];
    db.close();

    return attachments;
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
}

// Delete attachment
export function deleteAttachment(id: number): boolean {
  try {
    const db = getDatabase();

    // Get attachment info first to delete file
    const attachment = db.prepare('SELECT * FROM ticket_attachments WHERE id = ?').get(id) as TicketAttachment | undefined;

    if (attachment) {
      // Delete file from disk
      const filePath = path.join(UPLOADS_DIR, attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      const stmt = db.prepare('DELETE FROM ticket_attachments WHERE id = ?');
      stmt.run(id);
    }

    db.close();
    return true;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return false;
  }
}

// Save uploaded file
export async function saveUploadedFile(
  ticketNumber: string,
  file: File
): Promise<{ filename: string; originalName: string; fileSize: number; mimeType: string }> {
  ensureUploadsDir();

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const ext = path.extname(file.name);
  const filename = `${ticketNumber}_${timestamp}_${random}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    originalName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

// Add comment to ticket
export function addComment(comment: Omit<TicketComment, 'id' | 'created_at'>): number {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO ticket_comments (
        ticket_number, author_name, author_email, comment_text, is_internal
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      comment.ticket_number,
      comment.author_name || null,
      comment.author_email || null,
      comment.comment_text,
      comment.is_internal ? 1 : 0
    );

    db.close();
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error('Failed to add comment');
  }
}

// Get comments for a ticket
export function getTicketComments(ticketNumber: string, includeInternal: boolean = false): TicketComment[] {
  try {
    const db = getDatabase();

    const query = includeInternal
      ? 'SELECT * FROM ticket_comments WHERE ticket_number = ? ORDER BY created_at ASC'
      : 'SELECT * FROM ticket_comments WHERE ticket_number = ? AND is_internal = 0 ORDER BY created_at ASC';

    const stmt = db.prepare(query);
    const comments = stmt.all(ticketNumber) as TicketComment[];
    db.close();

    // Convert is_internal from integer to boolean
    return comments.map(c => ({
      ...c,
      is_internal: Boolean(c.is_internal),
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

// Update comment
export function updateComment(id: number, commentText: string): boolean {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE ticket_comments
      SET comment_text = ?
      WHERE id = ?
    `);

    const result = stmt.run(commentText, id);
    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error updating comment:', error);
    return false;
  }
}

// Delete comment
export function deleteComment(id: number): boolean {
  try {
    const db = getDatabase();

    const stmt = db.prepare('DELETE FROM ticket_comments WHERE id = ?');
    const result = stmt.run(id);
    db.close();

    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}
