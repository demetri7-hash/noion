/**
 * User Management API - List & Create Users
 * GET /api/v2/users - List users (filtered by role)
 * POST /api/v2/users - Create new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Restaurant, UserRole } from '@/models';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

// Force Node.js runtime for Casbin compatibility
export const runtime = 'nodejs';

/**
 * GET /api/v2/users
 * List users - scope based on requester's role
 */
export async function GET(request: NextRequest) {
  // Check authorization - managers can view team, admins can view all
  const authCheck = await authorize('users:team', 'read')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user } = authCheck;

  try {
    await connectDB();

    // Get query params
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const restaurantId = user.restaurantId;

    // Find restaurant and get users
    const restaurant = await Restaurant.findById(restaurantId).select('-owner.password');

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // For now, we only have owner in the schema
    // TODO: Extend to support multiple employees when Employee collection is added
    const users = [
      {
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
      },
    ];

    return NextResponse.json({
      success: true,
      users: role ? users.filter((u) => u.role === role) : users,
      count: users.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/users
 * Create new user (admin/owner only)
 */
export async function POST(request: NextRequest) {
  // Check authorization - admins can create users
  const authCheck = await authorize('users:all', 'create')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user: requestingUser } = authCheck;

  try {
    await connectDB();

    const body = await request.json();
    const { email, password, firstName, lastName, phone, role, hireDate } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, firstName, lastName' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already exists in this restaurant
    const restaurant = await Restaurant.findById(requestingUser.restaurantId);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (restaurant.owner.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // TODO: When Employee collection is added, create employee record here
    // For now, return message that multi-user support is coming
    return NextResponse.json(
      {
        success: false,
        message: 'Multi-user support coming soon. Currently only restaurant owner is supported.',
        todo: 'Create Employee collection and add employee creation logic here',
      },
      { status: 501 } // Not Implemented
    );

    // Future implementation:
    /*
    const hashedPassword = await bcrypt.hash(password, 12);

    const newEmployee = {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || UserRole.EMPLOYEE,
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      isActive: true,
      points: 0,
      level: 1,
      streak: 0,
    };

    // Save to Employee collection
    // Return created employee
    */
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
