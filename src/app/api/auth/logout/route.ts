import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear authentication cookies
 */
export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear refresh token cookie
  response.cookies.delete('refreshToken');

  return response;
}
