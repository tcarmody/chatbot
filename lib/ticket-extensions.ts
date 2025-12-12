// Ticket extensions (attachments and comments) using Neon Postgres
// Note: File uploads should use Vercel Blob or another cloud storage service
import { sql, initializeSchema } from './db';
import { TicketAttachment, TicketComment } from './tickets';

// Add attachment metadata to database
// Note: Actual file storage should be handled separately (e.g., Vercel Blob)
export async function addAttachment(attachment: Omit<TicketAttachment, 'id' | 'uploaded_at'> & { storage_url?: string }): Promise<number> {
  try {
    await initializeSchema();

    const result = await sql`
      INSERT INTO ticket_attachments (
        ticket_number, filename, original_name, file_size, mime_type, storage_url
      ) VALUES (
        ${attachment.ticket_number},
        ${attachment.filename},
        ${attachment.original_name},
        ${attachment.file_size},
        ${attachment.mime_type},
        ${attachment.storage_url || null}
      )
      RETURNING id
    `;

    return (result[0] as { id: number })?.id || 0;
  } catch (error) {
    console.error('Error adding attachment:', error);
    throw new Error('Failed to add attachment');
  }
}

// Get attachments for a ticket
export async function getTicketAttachments(ticketNumber: string): Promise<(TicketAttachment & { storage_url?: string })[]> {
  try {
    await initializeSchema();

    const result = await sql`
      SELECT * FROM ticket_attachments
      WHERE ticket_number = ${ticketNumber}
      ORDER BY uploaded_at DESC
    `;

    return (result as Array<{
      id: number;
      ticket_number: string;
      filename: string;
      original_name: string;
      file_size: number;
      mime_type: string;
      storage_url: string | null;
      uploaded_at: Date;
    }>).map(row => ({
      id: row.id,
      ticket_number: row.ticket_number,
      filename: row.filename,
      original_name: row.original_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      storage_url: row.storage_url ?? undefined,
      uploaded_at: row.uploaded_at?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
}

// Delete attachment metadata
// Note: Actual file deletion from storage should be handled separately
export async function deleteAttachment(id: number): Promise<{ deleted: boolean; storageUrl?: string }> {
  try {
    await initializeSchema();

    // Get attachment info first (for storage cleanup)
    const attachmentResult = await sql`
      SELECT storage_url FROM ticket_attachments WHERE id = ${id}
    `;

    const storageUrl = (attachmentResult[0] as { storage_url: string | null })?.storage_url ?? undefined;

    // Delete from database
    await sql`DELETE FROM ticket_attachments WHERE id = ${id}`;

    return { deleted: true, storageUrl };
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return { deleted: false };
  }
}

// Add comment to ticket
export async function addComment(comment: Omit<TicketComment, 'id' | 'created_at'>): Promise<number> {
  try {
    await initializeSchema();

    const result = await sql`
      INSERT INTO ticket_comments (
        ticket_number, author_name, author_email, comment_text, is_internal
      ) VALUES (
        ${comment.ticket_number},
        ${comment.author_name || null},
        ${comment.author_email || null},
        ${comment.comment_text},
        ${comment.is_internal}
      )
      RETURNING id
    `;

    return (result[0] as { id: number })?.id || 0;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error('Failed to add comment');
  }
}

// Get comments for a ticket
export async function getTicketComments(ticketNumber: string, includeInternal: boolean = false): Promise<TicketComment[]> {
  try {
    await initializeSchema();

    let result;
    if (includeInternal) {
      result = await sql`
        SELECT * FROM ticket_comments
        WHERE ticket_number = ${ticketNumber}
        ORDER BY created_at ASC
      `;
    } else {
      result = await sql`
        SELECT * FROM ticket_comments
        WHERE ticket_number = ${ticketNumber} AND is_internal = false
        ORDER BY created_at ASC
      `;
    }

    return (result as Array<{
      id: number;
      ticket_number: string;
      author_name: string | null;
      author_email: string | null;
      comment_text: string;
      is_internal: boolean;
      created_at: Date;
    }>).map(row => ({
      id: row.id,
      ticket_number: row.ticket_number,
      author_name: row.author_name ?? undefined,
      author_email: row.author_email ?? undefined,
      comment_text: row.comment_text,
      is_internal: row.is_internal,
      created_at: row.created_at?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

// Update comment
export async function updateComment(id: number, commentText: string): Promise<boolean> {
  try {
    await initializeSchema();

    await sql`
      UPDATE ticket_comments
      SET comment_text = ${commentText}
      WHERE id = ${id}
    `;

    return true;
  } catch (error) {
    console.error('Error updating comment:', error);
    return false;
  }
}

// Delete comment
export async function deleteComment(id: number): Promise<boolean> {
  try {
    await initializeSchema();

    await sql`DELETE FROM ticket_comments WHERE id = ${id}`;

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}
