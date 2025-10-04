export const dynamic = 'force-dynamic';

/**
 * Initialize Default Badges API
 * POST /api/v2/badges/init
 *
 * One-time initialization of default badges
 * Requires owner or admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { initializeDefaultBadges } from '@/lib/badges';

export async function POST(request: NextRequest) {
  return authorize(request, ['owner', 'restaurant_owner', 'admin'], async (user) => {
    try {
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
  });
}
