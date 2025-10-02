import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { ToastIntegration } from '@/services/ToastIntegration';

/**
 * GET /api/auth/toast/callback
 * Handle Toast OAuth callback
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // restaurantId

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    await connectDB();

    const restaurant = await Restaurant.findById(state);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Mark as connected (actual OAuth token exchange would happen here)
    await Restaurant.findByIdAndUpdate(state, {
      'posSystem.connected': true,
      'posSystem.lastSync': new Date()
    });

    // Redirect to dashboard with success
    const redirectUrl = new URL('/dashboard', req.url);
    redirectUrl.searchParams.set('pos_connected', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Toast callback error:', error);

    const redirectUrl = new URL('/pos', req.url);
    redirectUrl.searchParams.set('error', 'connection_failed');

    return NextResponse.redirect(redirectUrl);
  }
}
