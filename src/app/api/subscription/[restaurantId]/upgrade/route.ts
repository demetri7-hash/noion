import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SubscriptionService } from '@/services/SubscriptionService';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * POST /api/subscription/[restaurantId]/upgrade
 * Upgrade subscription tier
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
    const { tier, billingCycle = 'monthly' } = body;

    if (!tier) {
      return NextResponse.json(
        { error: 'Subscription tier is required' },
        { status: 400 }
      );
    }

    const validTiers = ['pulse', 'intelligence', 'command'];
    if (!validTiers.includes(tier.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const subscriptionService = new SubscriptionService();
    const result = await subscriptionService.createSubscription(
      params.restaurantId,
      tier,
      billingCycle
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
