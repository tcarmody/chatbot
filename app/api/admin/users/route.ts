import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import {
  getAllAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminUserByEmail
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/admin/users - List all admin users
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view users list
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const users = await getAllAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new admin user
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create users
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, name, password, role } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Validate role
    if (role && role !== 'admin' && role !== 'support') {
      return NextResponse.json({ error: 'Role must be either "admin" or "support"' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await getAdminUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const userId = await createAdminUser({
      email,
      name,
      password,
      role: role || 'support',
    });

    // Log the action
    logAudit({
      user_id: user.id!,
      user_email: user.email,
      action: 'create_user',
      resource_type: 'user',
      resource_id: userId.toString(),
      details: `Created user: ${email} with role: ${role || 'support'}`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      userId,
      message: 'User created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/admin/users - Update an admin user
export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update users
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, email, name, password, role, is_active } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Valid user ID is required' }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (userId === user.id && is_active === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (userId === user.id && role && role !== user.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Validate password length if provided
    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Validate role if provided
    if (role && role !== 'admin' && role !== 'support') {
      return NextResponse.json({ error: 'Role must be either "admin" or "support"' }, { status: 400 });
    }

    const updates: {
      name?: string;
      email?: string;
      password?: string;
      role?: 'admin' | 'support';
      is_active?: boolean;
    } = {};

    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (role) updates.role = role;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    const success = await updateAdminUser(userId, updates);

    if (success) {
      // Log the action
      const updateDetails = Object.keys(updates)
        .filter(k => k !== 'password')
        .map(k => `${k}: ${updates[k as keyof typeof updates]}`)
        .join(', ');

      logAudit({
        user_id: user.id!,
        user_email: user.email,
        action: 'update_user',
        resource_type: 'user',
        resource_id: userId.toString(),
        details: `Updated user fields: ${updateDetails}${password ? ', password' : ''}`,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true, message: 'User updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete (deactivate) an admin user
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete users
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Valid user ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const success = await deleteAdminUser(userId);

    if (success) {
      // Log the action
      logAudit({
        user_id: user.id!,
        user_email: user.email,
        action: 'delete_user',
        resource_type: 'user',
        resource_id: userId.toString(),
        details: 'Deactivated user account',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
