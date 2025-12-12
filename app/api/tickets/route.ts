import { NextRequest, NextResponse } from 'next/server';
import { createTicket, getTicketByNumber, getTicketsByEmail } from '@/lib/tickets';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

// POST - Create a new support ticket
export async function POST(req: NextRequest) {
  // Rate limiting for ticket creation
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.ticketCreate);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.user_email || !body.subject || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, subject, description' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.user_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the ticket in HubSpot
    const ticketNumber = await createTicket({
      user_email: body.user_email,
      user_name: body.user_name,
      subject: body.subject,
      description: body.description,
      status: 'open',
      priority: body.priority || 'medium',
      category: body.category,
      conversation_context: body.conversation_context,
    });

    return NextResponse.json({
      success: true,
      ticket_number: ticketNumber,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET - Retrieve ticket(s)
// Query params: ticket_number OR email
export async function GET(req: NextRequest) {
  // Rate limiting for ticket lookups
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.ticketLookup);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(req.url);
    const ticketNumber = searchParams.get('ticket_number');
    const email = searchParams.get('email');

    if (ticketNumber) {
      // Get single ticket by number (HubSpot ID)
      const ticket = await getTicketByNumber(ticketNumber);

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ ticket });
    } else if (email) {
      // Get all tickets for a user
      const tickets = await getTicketsByEmail(email);

      return NextResponse.json({ tickets });
    } else {
      return NextResponse.json(
        { error: 'Missing required parameter: ticket_number or email' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
