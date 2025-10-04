export const dynamic = 'force-dynamic';

/**
 * Initialize Default Badges API
 * POST /api/v2/badges/init
 *
 * One-time initialization of default badges
 * Requires owner or admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { initializeDefaultBadges } from '@/lib/badges';

interface IJwtPayload {
  userId: string;
  restaurantId: string;
  role: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    let payload: IJwtPayload;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'noion-development-secret-key';
      payload = jwt.verify(token, jwtSecret) as IJwtPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has required role
    const allowedRoles = ['owner', 'restaurant_owner', 'admin'];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Initialize badges
    await initializeDefaultBadges();

    return NextResponse.json({
      success: true,
      message: 'Default badges initialized successfully'
    });
  } catch (error: any) {
    console.error('Badge initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize badges' },
      { status: 500 }
    );
  }
}
