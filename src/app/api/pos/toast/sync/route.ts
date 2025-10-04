import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { decryptToastCredentials } from '@/utils/toastEncryption';
import { enqueueSyncJob } from '@/lib/queue';
import SyncJob from '@/models/SyncJob';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pos/toast/sync
 * Manually trigger a Toast sync using stored credentials
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('pos:manage', 'create')(request);
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

    // Check if Toast is configured
    if (!restaurant.posConfig?.clientId || !restaurant.posConfig?.encryptedClientSecret || !restaurant.posConfig?.locationId) {
      return NextResponse.json(
        {
          error: 'Toast POS not fully configured',
          details: 'Missing credentials. Please reconnect to Toast POS.'
        },
        { status: 400 }
      );
    }

    // Decrypt stored credentials
    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
      locationId: restaurant.posConfig.locationId
    });

    // Determine sync date range
    const lastSyncDate = restaurant.posConfig.lastSyncAt;
    const now = new Date();

    let startDate: Date;
    let fullSync: boolean;

    if (lastSyncDate) {
      // Incremental sync: only get data since last sync
      startDate = new Date(lastSyncDate);
      fullSync = false;
      console.log(`🔄 Manual sync triggered: incremental from ${startDate.toISOString()}`);
    } else {
      // First-time sync: get last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fullSync = true;
      console.log('🔄 Manual sync triggered: full sync (last 30 days)');
    }

    // Enqueue background sync job
    const jobId = await enqueueSyncJob({
      restaurantId: String(restaurant._id),
      posType: 'toast',
      credentials: {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        locationGuid: credentials.locationGuid
      },
      options: {
        startDate,
        endDate: now,
        fullSync
      },
      notificationEmail: restaurant.owner.email
    });

    // Create SyncJob record
    await SyncJob.create({
      restaurantId: restaurant._id,
      posType: 'toast',
      status: 'pending',
      jobId,
      notificationEmail: restaurant.owner.email,
      maxAttempts: 3
    });

    console.log(`✅ Manual sync job enqueued: ${jobId}`);
    console.log(`   Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: fullSync
        ? 'Sync started! Pulling last 30 days of data...'
        : 'Sync started! Pulling new data since last sync...',
      data: {
        jobId,
        syncType: fullSync ? 'full' : 'incremental',
        dateRange: {
          from: startDate.toISOString(),
          to: now.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
