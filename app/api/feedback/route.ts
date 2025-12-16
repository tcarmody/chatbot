import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeSchema } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { chatLogger, logError } from '@/lib/logger';

// Handle CORS preflight requests for widget embedding
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.chat);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { messageId, userMessage, assistantResponse, feedback } = await req.json();

    if (!messageId || !userMessage || !assistantResponse || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (feedback !== 'positive' && feedback !== 'negative') {
      return NextResponse.json(
        { error: 'Invalid feedback value' },
        { status: 400 }
      );
    }

    await initializeSchema();

    // Insert or update feedback (upsert)
    await sql`
      INSERT INTO response_feedback (message_id, user_message, assistant_response, feedback)
      VALUES (${messageId}, ${userMessage}, ${assistantResponse}, ${feedback})
      ON CONFLICT (message_id)
      DO UPDATE SET feedback = ${feedback}, created_at = CURRENT_TIMESTAMP
    `;

    chatLogger.info('Feedback submitted', {
      messageId,
      feedback,
      userMessagePreview: userMessage.substring(0, 50),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/feedback', ip: clientIP });
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
