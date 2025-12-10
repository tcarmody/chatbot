import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './auth';
import { cookies } from 'next/headers';

export async function requireAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const user = validateSession(sessionToken);

  if (!user) {
    // Clear invalid cookie
    cookieStore.delete('admin_session');
    return null;
  }

  return user;
}

export function createAuthMiddleware() {
  return async (req: NextRequest) => {
    const user = await requireAdmin(req);

    if (!user) {
      // Not authenticated - redirect to login
      const url = new URL('/admin/login', req.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  };
}
