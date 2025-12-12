// Ticket Management using HubSpot API
import {
  createHubSpotTicket,
  getHubSpotTicket,
  searchHubSpotTicketsByEmail,
  getAllHubSpotTickets,
  updateHubSpotTicketStatus,
  getHubSpotTicketStats,
  mapStageToStatus,
  mapPriorityFromHubSpot,
} from './hubspot';

export interface Ticket {
  id?: string; // HubSpot ticket ID
  ticket_number: string; // HubSpot ticket ID (for backwards compatibility)
  user_email: string;
  user_name?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  conversation_context?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TicketAttachment {
  id?: number;
  ticket_number: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at?: string;
}

export interface TicketComment {
  id?: number;
  ticket_number: string;
  author_name?: string;
  author_email?: string;
  comment_text: string;
  is_internal: boolean;
  created_at?: string;
}

// Helper to convert HubSpot ticket to our Ticket interface
function hubspotToTicket(hubspotTicket: {
  id: string;
  properties: {
    subject: string;
    content?: string;
    hs_pipeline_stage: string;
    hs_ticket_priority?: string;
    createdate: string;
    hs_lastmodifieddate: string;
    user_email?: string;
    user_name?: string;
    category?: string;
    conversation_context?: string;
    [key: string]: string | undefined;
  };
}): Ticket {
  return {
    id: hubspotTicket.id,
    ticket_number: hubspotTicket.id, // Use HubSpot ID as ticket number
    user_email: hubspotTicket.properties.user_email || '',
    user_name: hubspotTicket.properties.user_name,
    subject: hubspotTicket.properties.subject || '',
    description: hubspotTicket.properties.content || '',
    status: mapStageToStatus(hubspotTicket.properties.hs_pipeline_stage),
    priority: mapPriorityFromHubSpot(hubspotTicket.properties.hs_ticket_priority),
    category: hubspotTicket.properties.category,
    conversation_context: hubspotTicket.properties.conversation_context,
    created_at: hubspotTicket.properties.createdate,
    updated_at: hubspotTicket.properties.hs_lastmodifieddate,
  };
}

// Create a new support ticket
export async function createTicket(
  ticket: Omit<Ticket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>
): Promise<string> {
  try {
    const result = await createHubSpotTicket({
      user_email: ticket.user_email,
      user_name: ticket.user_name,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      category: ticket.category,
      conversation_context: ticket.conversation_context,
    });

    return result.ticketId;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw new Error('Failed to create support ticket');
  }
}

// Get ticket by ticket number (HubSpot ID)
export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  try {
    const hubspotTicket = await getHubSpotTicket(ticketNumber);

    if (!hubspotTicket) {
      return null;
    }

    return hubspotToTicket(hubspotTicket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
}

// Get all tickets for a user by email
export async function getTicketsByEmail(email: string): Promise<Ticket[]> {
  try {
    const hubspotTickets = await searchHubSpotTicketsByEmail(email);
    return hubspotTickets.map(hubspotToTicket);
  } catch (error) {
    console.error('Error fetching tickets by email:', error);
    return [];
  }
}

// Update ticket status
export async function updateTicketStatus(
  ticketNumber: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<boolean> {
  try {
    return await updateHubSpotTicketStatus(ticketNumber, status);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return false;
  }
}

// Get all tickets (for admin view)
export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tickets: Ticket[]; total: number }> {
  try {
    const result = await getAllHubSpotTickets({
      status: filters?.status,
      priority: filters?.priority,
      limit: filters?.limit || 50,
    });

    return {
      tickets: result.tickets.map(hubspotToTicket),
      total: result.total,
    };
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return { tickets: [], total: 0 };
  }
}

// Get ticket statistics
export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  by_priority: { low: number; medium: number; high: number };
}> {
  try {
    return await getHubSpotTicketStats();
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
