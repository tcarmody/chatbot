// Ticket extensions (attachments and comments) using Vercel Postgres
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

    return result.rows[0]?.id || 0;
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

    return result.rows.map(row => ({
      id: row.id as number,
      ticket_number: row.ticket_number as string,
      filename: row.filename as string,
      original_name: row.original_name as string,
      file_size: row.file_size as number,
      mime_type: row.mime_type as string,
      storage_url: row.storage_url as string | undefined,
      uploaded_at: (row.uploaded_at as Date)?.toISOString(),
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

    const storageUrl = attachmentResult.rows[0]?.storage_url as string | undefined;

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

    return result.rows[0]?.id || 0;
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

    return result.rows.map(row => ({
      id: row.id as number,
      ticket_number: row.ticket_number as string,
      author_name: row.author_name as string | undefined,
      author_email: row.author_email as string | undefined,
      comment_text: row.comment_text as string,
      is_internal: row.is_internal as boolean,
      created_at: (row.created_at as Date)?.toISOString(),
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

    const result = await sql`
      UPDATE ticket_comments
      SET comment_text = ${commentText}
      WHERE id = ${id}
    `;

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error updating comment:', error);
    return false;
  }
}

// Delete comment
export async function deleteComment(id: number): Promise<boolean> {
  try {
    await initializeSchema();

    const result = await sql`DELETE FROM ticket_comments WHERE id = ${id}`;

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}
