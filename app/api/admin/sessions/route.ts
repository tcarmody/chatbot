import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { getAllSessions, deleteSessionById } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  // Check authentication
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await getAllSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Check authentication
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== 'number') {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const success = await deleteSessionById(sessionId);

    if (success) {
      // Log the action
      logAudit({
        user_id: user.id!,
        user_email: user.email,
        action: 'force_logout',
        resource_type: 'session',
        resource_id: sessionId.toString(),
        details: 'Forcefully terminated user session',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
