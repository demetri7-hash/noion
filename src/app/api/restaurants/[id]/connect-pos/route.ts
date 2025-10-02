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
    // TODO: Re-enable auth once user system is set up
    // const auth = await verifyAuth(req);
    // if (!auth) {
    //   return unauthorizedResponse();
    // }

    await connectDB();

    const body = await req.json();
    const { posType } = body;

    if (!posType) {
      return NextResponse.json(
        { error: 'POS type is required' },
        { status: 400 }
      );
    }

    // Find or create test restaurant for testing
    let restaurant;

    try {
      restaurant = await Restaurant.findById(params.id);
    } catch (castError) {
      // params.id is not a valid ObjectId, try to find existing test restaurant
      console.log('Invalid ObjectId, looking for existing test restaurant...');
      restaurant = null;
    }

    // If not found by ID, try to find existing test restaurant by email
    if (!restaurant) {
      console.log('Restaurant not found by ID, searching by test email...');
      restaurant = await Restaurant.findOne({ 'owner.email': 'test@example.com' });
    }

    // If still not found, create a new test restaurant
    if (!restaurant) {
      console.log('No existing test restaurant found, creating new one...');
      // Create a test restaurant for development with proper ObjectId
      restaurant = new Restaurant({
        name: 'Test Restaurant',
        type: 'casual_dining',
        owner: {
          firstName: 'Test',
          lastName: 'Owner',
          email: 'test@example.com',
          phone: '555-0100',
          password: 'temporary_password_hash'
        },
        location: {
          address: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          zipCode: '90001',
          country: 'US'
        },
        posConfig: {
          type: 'toast',
          isConnected: false
        },
        subscription: {
          plan: 'Intelligence',
          tier: 'intelligence',
          status: 'trialing',
          startDate: new Date(),
          billingCycle: 'monthly',
          amount: 299,
          currency: 'USD'
        }
      });
      await restaurant.save();
      console.log('Test restaurant created with ID:', restaurant._id);
    } else {
      console.log('Using existing test restaurant with ID:', restaurant._id);
    }

    // NOTE: Toast does not use traditional OAuth redirects
    // This endpoint now expects manual credentials in the request body

    switch (posType.toLowerCase()) {
      case 'toast': {
        // Use environment variables for testing (Vercel env vars)
        const credentials = {
          clientId: process.env.TOAST_CLIENT_ID || '',
          clientSecret: process.env.TOAST_CLIENT_SECRET || '',
          locationGuid: process.env.TOAST_RESTAURANT_GUID || ''
        };

        console.log('Checking Toast credentials:', {
          hasClientId: !!credentials.clientId,
          hasClientSecret: !!credentials.clientSecret,
          hasLocationGuid: !!credentials.locationGuid,
          clientIdLength: credentials.clientId.length,
          locationGuid: credentials.locationGuid
        });

        if (!credentials.clientId || !credentials.clientSecret || !credentials.locationGuid) {
          return NextResponse.json(
            {
              error: 'Toast credentials not configured in environment variables',
              hint: 'Set TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_RESTAURANT_GUID in Vercel',
              missing: {
                clientId: !credentials.clientId,
                clientSecret: !credentials.clientSecret,
                locationGuid: !credentials.locationGuid
              }
            },
            { status: 500 }
          );
        }

        console.log('Connecting to Toast using environment credentials...');

        try {
          // Connect to Toast with environment credentials
          const toastService = new ToastIntegration();
          console.log('Calling toastService.connectRestaurant...');

          // Use the actual restaurant._id (MongoDB ObjectId) instead of params.id
          const restaurantId = String(restaurant._id);
          await toastService.connectRestaurant(restaurantId, credentials);

          console.log('Toast connection successful, updating restaurant...');

          // Update restaurant with POS type
          restaurant.posConfig.type = posType;
          await restaurant.save();

          console.log('✅ Toast connected successfully with restaurant GUID:', credentials.locationGuid);

          return NextResponse.json({
            success: true,
            data: {
              posType: 'toast',
              connected: true,
              restaurantId: String(restaurant._id),
              restaurantGuid: credentials.locationGuid
            },
          });
        } catch (toastError) {
          console.error('Toast connection failed:', toastError);
          throw toastError;
        }
      }
      case 'square':
        return NextResponse.json(
          { error: 'Square integration coming soon' },
          { status: 501 }
        );
      case 'clover':
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
  } catch (error) {
    console.error('POS connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        hint: 'Check Vercel logs for full error details'
      },
      { status: 500 }
    );
  }
}
