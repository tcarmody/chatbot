import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/lib/analytics';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(req: NextRequest) {
  // Require admin authentication
  const user = await requireAdmin(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  try {
    const summary = getAnalyticsSummary();

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to retrieve analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
      { status: 500 }
    );
  }
}
