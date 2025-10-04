import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import jwt from 'jsonwebtoken';

/**
 * GET /api/auth/me
 * Get current user's profile information
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.JWT_SECRET || 'noion-development-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    // Find restaurant by ID
    const restaurant = await Restaurant.findById(decoded.restaurantId).select('-owner.password');

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Return user profile with restaurant data
    return NextResponse.json({
      success: true,
      data: {
        id: decoded.userId,
        email: restaurant.owner.email,
        firstName: restaurant.owner.firstName,
        lastName: restaurant.owner.lastName,
        name: `${restaurant.owner.firstName} ${restaurant.owner.lastName}`,
        phone: restaurant.owner.phone,
        role: restaurant.owner.role,
        restaurantId: String(restaurant._id),
        restaurantName: restaurant.name,
        restaurantType: restaurant.type,
        subscriptionTier: restaurant.subscription.tier,
        trialEndsAt: restaurant.subscription.trialEndsAt
      }
    });

  } catch (error: any) {
    console.error('Get user profile error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
