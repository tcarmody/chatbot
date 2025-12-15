import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsForCategory } from '@/lib/analytics';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  const categoryName = req.nextUrl.searchParams.get('category');

  if (!categoryName) {
    return NextResponse.json(
      { error: 'Category name is required' },
      { status: 400 }
    );
  }

  try {
    const questions = await getQuestionsForCategory(categoryName);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching category questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
