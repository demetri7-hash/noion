import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { ToastIntegration } from '@/services/ToastIntegration';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * POST /api/restaurants/[id]/connect-pos
 * Initiate POS OAuth connection
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    await connectDB();

    const body = await req.json();
    const { posType } = body;

    if (!posType) {
      return NextResponse.json(
        { error: 'POS type is required' },
        { status: 400 }
      );
    }

    const restaurant = await Restaurant.findById(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    if (restaurant._id.toString() !== auth.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let authUrl = '';

    // Generate OAuth URL based on POS type
    switch (posType.toLowerCase()) {
      case 'toast': {
        const toastService = new ToastIntegration();
        authUrl = toastService.getAuthorizationUrl(params.id);
        break;
      }
      case 'square':
        // Future implementation
        return NextResponse.json(
          { error: 'Square integration coming soon' },
          { status: 501 }
        );
      case 'clover':
        // Future implementation
        return NextResponse.json(
          { error: 'Clover integration coming soon' },
          { status: 501 }
        );
      default:
        return NextResponse.json(
          { error: 'Unsupported POS type' },
          { status: 400 }
        );
    }

    // Update restaurant with POS type
    restaurant.posSystem.type = posType;
    await restaurant.save();

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        posType,
      },
    });
  } catch (error) {
    console.error('POS connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
