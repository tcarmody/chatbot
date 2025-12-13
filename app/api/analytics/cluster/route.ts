import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsForCluster } from '@/lib/analytics';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  const clusterName = req.nextUrl.searchParams.get('cluster');

  if (!clusterName) {
    return NextResponse.json(
      { error: 'Cluster name is required' },
      { status: 400 }
    );
  }

  try {
    const questions = await getQuestionsForCluster(clusterName);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching cluster questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
