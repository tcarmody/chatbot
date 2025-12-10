import { NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/lib/analytics';

export async function GET() {
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
