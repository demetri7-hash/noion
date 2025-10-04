import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AuthService } from '@/services/AuthService';

/**
 * POST /api/auth/signup
 * Register a new restaurant owner
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      restaurantName,
      restaurantType,
      address,
      city,
      state,
      zipCode,
      subscriptionTier = 'intelligence'
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !password || !phone || !restaurantName || !restaurantType || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.registerRestaurantOwner({
      firstName,
      lastName,
      email,
      password,
      phone,
      restaurantData: {
        name: restaurantName,
        type: restaurantType,
        address,
        city,
        state,
        zipCode,
        subscriptionTier,
        timezone: 'America/New_York'
      }
    });

    // Check if registration was successful
    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // Set HTTP-only cookie for refresh token
    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      },
      { status: 201 }
    );

    if (result.refreshToken) {
      response.cookies.set('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    return response;
  } catch (error: unknown) {
    console.error('Signup error:', error);

    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
