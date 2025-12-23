import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { getRateLimitStats } from '@/lib/rate-limit';

// GET /api/admin/rate-limits - Get rate limit statistics
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get hours parameter from query string (default 24)
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    const stats = await getRateLimitStats(hours);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching rate limit stats:', error);
    return NextResponse.json({ error: 'Failed to fetch rate limit stats' }, { status: 500 });
  }
}
