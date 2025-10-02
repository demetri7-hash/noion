import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SubscriptionService } from '@/services/SubscriptionService';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * POST /api/subscription/[restaurantId]/cancel
 * Cancel subscription
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.restaurantId !== params.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { immediately = false } = body;

    const subscriptionService = new SubscriptionService();
    await subscriptionService.cancelSubscription(params.restaurantId, immediately);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
