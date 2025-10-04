import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '../../../../../middleware/authorize';
import Restaurant, { POSSystemType } from '../../../../../models/Restaurant';
import SyncJob from '../../../../../models/SyncJob';
import { enqueueSyncJob } from '../../../../../lib/queue';
import { encryptToastCredentials } from '../../../../../utils/toastEncryption';
import connectDB from '../../../../../lib/mongodb';

/**
 * POST /api/pos/toast/connect
 * Connect Toast POS with user's credentials (JWT authenticated)
 *
 * Features:
 * - Uses logged-in user's restaurant from JWT
 * - Encrypts and stores credentials securely
 * - Incremental sync: only pulls new data since last sync
 * - Auto-reconnect: credentials saved for future logins
 */
export async function POST(request: NextRequest) {
  // Check authorization
  const authCheck = await authorize('pos:manage', 'create')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user } = authCheck;

  try {
    // Connect to MongoDB
    await connectDB();

    const body = await request.json();
    const { locationGuid, clientId, clientSecret } = body;

    // Validate inputs
    if (!locationGuid || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: locationGuid, clientId, clientSecret' },
        { status: 400 }
      );
    }

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(locationGuid)) {
      return NextResponse.json(
        { error: 'Invalid GUID format' },
        { status: 400 }
      );
    }

    // Get restaurant from JWT token
    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Encrypt credentials before storing
    const encryptedCredentials = encryptToastCredentials({
      clientId,
      clientSecret,
      locationGuid
    });

    // Determine sync date range
    const lastSyncDate = restaurant.posConfig?.lastSyncAt;
    const now = new Date();

    let startDate: Date;
    let fullSync: boolean;

    if (lastSyncDate) {
      // Incremental sync: only get data since last sync
      startDate = lastSyncDate;
      fullSync = false;
      console.log(`Incremental sync from ${lastSyncDate.toISOString()}`);
    } else {
      // First-time sync: get last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fullSync = true;
      console.log('First-time sync: last 30 days');
    }

    // Enqueue background sync job
    const jobId = await enqueueSyncJob({
      restaurantId: user.restaurantId,
      posType: 'toast',
      credentials: {
        clientId,
        clientSecret,
        locationGuid
      },
      options: {
        startDate,
        endDate: now,
        fullSync
      },
      notificationEmail: user.email
    });

    // Create SyncJob record
    const syncJob = await SyncJob.create({
      restaurantId: restaurant._id,
      posType: 'toast',
      status: 'pending',
      jobId,
      notificationEmail: user.email,
      maxAttempts: 3
    });

    // Update restaurant with encrypted credentials and POS config
    restaurant.posConfig = {
      type: POSSystemType.TOAST,
      isConnected: false, // Will be set to true after first successful sync
      clientId: encryptedCredentials.clientId, // Store encrypted
      encryptedAccessToken: encryptedCredentials.clientSecret, // Store encrypted
      encryptedClientSecret: encryptedCredentials.clientSecret,
      locationId: locationGuid,
      lastSyncAt: lastSyncDate, // Will be updated by sync job
      syncInterval: 'on_login', // Sync every time user logs in
      isActive: true
    };

    await restaurant.save();

    console.log(`✅ Toast connection initiated for restaurant ${user.restaurantId}`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Sync type: ${fullSync ? 'full' : 'incremental'}`);
    console.log(`   Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      data: {
        message: fullSync
          ? 'Initial sync started. Pulling last 30 days of data...'
          : 'Incremental sync started. Pulling new data since last login...',
        syncType: fullSync ? 'full' : 'incremental',
        syncJob: {
          id: String(syncJob._id),
          jobId,
          status: 'pending'
        },
        dateRange: {
          from: startDate.toISOString(),
          to: now.toISOString(),
          days: Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
        }
      }
    });

  } catch (error: any) {
    console.error('Toast connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect Toast POS' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pos/toast/connect
 * Check if user's Toast is connected
 */
export async function GET(request: NextRequest) {
  // Check authorization
  const authCheck = await authorize('pos:manage', 'read')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user } = authCheck;

  try {
    // Connect to MongoDB
    await connectDB();

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const isConnected = restaurant.posConfig?.isConnected && restaurant.posConfig?.type === POSSystemType.TOAST;
    const lastSyncAt = restaurant.posConfig?.lastSyncAt;

    return NextResponse.json({
      success: true,
      data: {
        isConnected,
        posType: restaurant.posConfig?.type,
        lastSyncAt: lastSyncAt?.toISOString(),
        locationId: restaurant.posConfig?.locationId,
        syncInterval: restaurant.posConfig?.syncInterval || 'manual'
      }
    });

  } catch (error: any) {
    console.error('Error checking Toast connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check connection status' },
      { status: 500 }
    );
  }
}
