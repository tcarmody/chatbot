import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { sql, initializeSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  try {
    await initializeSchema();

    // Get feedback with pagination
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const feedbackType = searchParams.get('type'); // 'positive' or 'negative'

    // Get feedback entries
    let feedback;
    if (feedbackType) {
      feedback = await sql`
        SELECT id, message_id, user_message, assistant_response, feedback, created_at
        FROM response_feedback
        WHERE feedback = ${feedbackType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      feedback = await sql`
        SELECT id, message_id, user_message, assistant_response, feedback, created_at
        FROM response_feedback
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count
    const countResult = feedbackType
      ? await sql`SELECT COUNT(*) as count FROM response_feedback WHERE feedback = ${feedbackType}`
      : await sql`SELECT COUNT(*) as count FROM response_feedback`;
    const total = Number((countResult[0] as { count: string })?.count || 0);

    // Get counts by type
    const typeCounts = await sql`
      SELECT feedback, COUNT(*) as count
      FROM response_feedback
      GROUP BY feedback
    `;

    return NextResponse.json({
      feedback: feedback as any[],
      total,
      typeCounts: (typeCounts as { feedback: string; count: string }[]).reduce(
        (acc, row) => ({ ...acc, [row.feedback]: Number(row.count) }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
