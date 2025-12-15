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

    // Get FAQ gaps with pagination
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const gapType = searchParams.get('type'); // Filter by gap type

    // Get gaps
    let gaps;
    if (gapType) {
      gaps = await sql`
        SELECT id, user_message, detected_categories, gap_type, suggested_topic, created_at
        FROM faq_gaps
        WHERE gap_type = ${gapType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      gaps = await sql`
        SELECT id, user_message, detected_categories, gap_type, suggested_topic, created_at
        FROM faq_gaps
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count
    const countResult = gapType
      ? await sql`SELECT COUNT(*) as count FROM faq_gaps WHERE gap_type = ${gapType}`
      : await sql`SELECT COUNT(*) as count FROM faq_gaps`;
    const total = Number((countResult[0] as { count: string })?.count || 0);

    // Get counts by type
    const typeCounts = await sql`
      SELECT gap_type, COUNT(*) as count
      FROM faq_gaps
      GROUP BY gap_type
    `;

    return NextResponse.json({
      gaps: (gaps as any[]).map(g => ({
        ...g,
        detected_categories: JSON.parse(g.detected_categories),
      })),
      total,
      typeCounts: (typeCounts as { gap_type: string; count: string }[]).reduce(
        (acc, row) => ({ ...acc, [row.gap_type]: Number(row.count) }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Error fetching FAQ gaps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ gaps' },
      { status: 500 }
    );
  }
}
