import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * GET /api/restaurants/[id]
 * Get restaurant details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    await connectDB();

    const restaurant = await Restaurant.findById(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (String(restaurant._id) !== auth.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/restaurants/[id]
 * Update restaurant details
 */
export async function PUT(
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
    const { name, type, address, phone } = body;

    const restaurant = await Restaurant.findById(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    if (String(restaurant._id) !== auth.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (name) restaurant.name = name;
    if (type) restaurant.type = type;
    if (address) restaurant.location.address = address;
    if (phone) restaurant.phone = phone;

    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: restaurant,
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
