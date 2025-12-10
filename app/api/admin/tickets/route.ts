import { NextRequest, NextResponse } from 'next/server';
import { getAllTickets, getTicketStats, updateTicketStatus, getTicketByNumber } from '@/lib/tickets';
import { sendTicketStatusChangeNotification } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-middleware';

// GET - Get all tickets with optional filters
export async function GET(req: NextRequest) {
  // Check authentication
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const getStats = searchParams.get('stats') === 'true';

    if (getStats) {
      // Return statistics only
      const stats = getTicketStats();
      return NextResponse.json({ stats });
    }

    // Return tickets with pagination
    const result = getAllTickets({
      status,
      priority,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// PATCH - Update ticket status
export async function PATCH(req: NextRequest) {
  // Check authentication
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try{
    const body = await req.json();
    const { ticket_number, status } = body;

    if (!ticket_number || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: ticket_number, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: open, in_progress, resolved, closed' },
        { status: 400 }
      );
    }

    // Get ticket details before updating
    const ticket = getTicketByNumber(ticket_number);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update the status
    const success = updateTicketStatus(ticket_number, status);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update ticket status' },
        { status: 500 }
      );
    }

    // Send status change notification to user (don't block on failure)
    if (process.env.RESEND_API_KEY && ticket.user_email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      sendTicketStatusChangeNotification({
        ticketNumber: ticket.ticket_number,
        userEmail: ticket.user_email,
        userName: ticket.user_name,
        subject: ticket.subject,
        newStatus: status,
        ticketUrl: `${appUrl}/tickets/${ticket.ticket_number}`,
      }).catch(err => console.error('Failed to send status change notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket status updated successfully',
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
