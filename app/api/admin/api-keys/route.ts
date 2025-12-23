import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
} from '@/lib/api-keys';
import { logAudit } from '@/lib/audit';

// GET /api/admin/api-keys - List all API keys
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view API keys
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST /api/admin/api-keys - Create a new API key
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create API keys
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate name length
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const { keyId, fullKey } = await createApiKey(name.trim(), user.id!);

    // Log the action
    logAudit({
      user_id: user.id!,
      user_email: user.email,
      action: 'create_api_key',
      resource_type: 'api_key',
      resource_id: keyId,
      details: `Created API key: ${name}`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      keyId,
      fullKey, // Only returned once - must be saved by the user
      message: 'API key created successfully. Save this key - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// PUT /api/admin/api-keys - Revoke an API key (soft delete)
export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can revoke API keys
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { keyId } = body;

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: 'Valid key ID is required' }, { status: 400 });
    }

    const success = await revokeApiKey(keyId);

    if (success) {
      // Log the action
      logAudit({
        user_id: user.id!,
        user_email: user.email,
        action: 'revoke_api_key',
        resource_type: 'api_key',
        resource_id: keyId,
        details: 'Revoked API key',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true, message: 'API key revoked successfully' });
    } else {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}

// DELETE /api/admin/api-keys - Permanently delete an API key
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete API keys
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { keyId } = body;

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: 'Valid key ID is required' }, { status: 400 });
    }

    const success = await deleteApiKey(keyId);

    if (success) {
      // Log the action
      logAudit({
        user_id: user.id!,
        user_email: user.email,
        action: 'delete_api_key',
        resource_type: 'api_key',
        resource_id: keyId,
        details: 'Permanently deleted API key',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true, message: 'API key deleted successfully' });
    } else {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
