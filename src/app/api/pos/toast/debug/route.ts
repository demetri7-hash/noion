import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pos/toast/debug
 * Debug endpoint to check Toast credentials status
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('pos:manage', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const restaurant = await Restaurant.findById(user.restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const posConfig = restaurant.posConfig;

    return NextResponse.json({
      success: true,
      debug: {
        hasClientId: !!posConfig?.clientId,
        clientIdLength: posConfig?.clientId?.length || 0,
        clientIdPreview: posConfig?.clientId ? `${posConfig.clientId.substring(0, 20)}...` : null,

        hasEncryptedSecret: !!posConfig?.encryptedClientSecret,
        encryptedSecretLength: posConfig?.encryptedClientSecret?.length || 0,

        hasLocationId: !!posConfig?.locationId,
        locationId: posConfig?.locationId || null,

        isConnected: posConfig?.isConnected || false,
        isActive: posConfig?.isActive || false,
        type: posConfig?.type || null,
        syncInterval: posConfig?.syncInterval || null,
        lastSyncAt: posConfig?.lastSyncAt || null,

        // Check if credentials look encrypted
        clientIdLooksEncrypted: posConfig?.clientId ? posConfig.clientId.includes(':') : false,
        secretLooksEncrypted: posConfig?.encryptedClientSecret ? posConfig.encryptedClientSecret.includes(':') : false,
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
