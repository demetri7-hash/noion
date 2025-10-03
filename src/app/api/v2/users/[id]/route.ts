/**
 * User Management API - Individual User Operations
 * GET /api/v2/users/[id] - Get user by ID
 * PUT /api/v2/users/[id] - Update user
 * DELETE /api/v2/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize, getAuthenticatedUser } from '@/middleware/authorize';
import { Restaurant, UserRole } from '@/models';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

// Force Node.js runtime for Casbin compatibility
export const runtime = 'nodejs';

/**
 * GET /api/v2/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await getAuthenticatedUser(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user: requestingUser } = authCheck;
  const { id } = params;

  try {
    await connectDB();

    const restaurant = await Restaurant.findById(requestingUser.restaurantId).select(
      '-owner.password'
    );

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // For now, only owner exists
    if (id !== String(restaurant._id)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permission - can view own profile or has permission to view team/all users
    const isOwnProfile = requestingUser.userId === restaurant.owner.email;
    if (!isOwnProfile) {
      const permCheck = await authorize('users:team', 'read')(request);
      if (permCheck instanceof NextResponse) return permCheck;
    }

    const userData = {
      id: restaurant._id,
      email: restaurant.owner.email,
      firstName: restaurant.owner.firstName,
      lastName: restaurant.owner.lastName,
      role: restaurant.owner.role || UserRole.OWNER,
      phone: restaurant.owner.phone,
      isActive: restaurant.owner.isActive ?? true,
      points: restaurant.owner.points || 0,
      level: restaurant.owner.level || 1,
      streak: restaurant.owner.streak || 0,
      hireDate: restaurant.owner.hireDate,
      lastActivityDate: restaurant.owner.lastActivityDate,
    };

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to retrieve user' }, { status: 500 });
  }
}

/**
 * PUT /api/v2/users/[id]
 * Update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await getAuthenticatedUser(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user: requestingUser } = authCheck;
  const { id } = params;

  try {
    await connectDB();

    const body = await request.json();
    const { firstName, lastName, phone, role, isActive, points, level, streak } = body;

    const restaurant = await Restaurant.findById(requestingUser.restaurantId);

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // For now, only owner exists
    if (id !== String(restaurant._id)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permission - can update own profile or has admin permission
    const isOwnProfile = requestingUser.userId === restaurant.owner.email;
    if (!isOwnProfile) {
      const permCheck = await authorize('users:all', 'update')(request);
      if (permCheck instanceof NextResponse) return permCheck;
    }

    // Update fields (only if provided)
    if (firstName) restaurant.owner.firstName = firstName;
    if (lastName) restaurant.owner.lastName = lastName;
    if (phone) restaurant.owner.phone = phone;

    // Role, points, level, streak - admin only
    if (!isOwnProfile || requestingUser.role === UserRole.ADMIN || requestingUser.role === UserRole.OWNER) {
      if (role) restaurant.owner.role = role;
      if (typeof isActive === 'boolean') restaurant.owner.isActive = isActive;
      if (typeof points === 'number') restaurant.owner.points = points;
      if (typeof level === 'number') restaurant.owner.level = level;
      if (typeof streak === 'number') restaurant.owner.streak = streak;
    }

    await restaurant.save();

    const updatedUser = {
      id: restaurant._id,
      email: restaurant.owner.email,
      firstName: restaurant.owner.firstName,
      lastName: restaurant.owner.lastName,
      role: restaurant.owner.role,
      phone: restaurant.owner.phone,
      isActive: restaurant.owner.isActive,
      points: restaurant.owner.points,
      level: restaurant.owner.level,
      streak: restaurant.owner.streak,
    };

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE /api/v2/users/[id]
 * Delete user (admin/owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Only admins can delete users
  const authCheck = await authorize('users:all', 'delete')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user: requestingUser } = authCheck;
  const { id } = params;

  try {
    await connectDB();

    // Prevent self-deletion
    if (id === requestingUser.restaurantId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // TODO: When Employee collection exists, delete employee
    return NextResponse.json(
      {
        success: false,
        message: 'Multi-user deletion coming soon. Currently only owner exists.',
        todo: 'Implement employee deletion when Employee collection is added',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
