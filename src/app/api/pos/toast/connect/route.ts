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

    console.log('Connect request body:', {
      hasLocationGuid: !!locationGuid,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      locationGuidLength: locationGuid?.length,
      clientIdLength: clientId?.length,
      clientSecretLength: clientSecret?.length
    });

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

    console.log('Encrypted credentials:', {
      hasClientId: !!encryptedCredentials.clientId,
      hasClientSecret: !!encryptedCredentials.clientSecret,
      hasLocationGuid: !!encryptedCredentials.locationGuid,
      clientIdLength: encryptedCredentials.clientId?.length,
      clientSecretLength: encryptedCredentials.clientSecret?.length
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
      clientId: encryptedCredentials.clientId, // Encrypted clientId
      encryptedClientSecret: encryptedCredentials.clientSecret, // Encrypted clientSecret
      locationId: encryptedCredentials.locationGuid, // Plain locationGuid
      lastSyncAt: lastSyncDate, // Will be updated by sync job
      syncInterval: 'on_login', // Sync every time user logs in
      isActive: true
    };

    console.log('About to save posConfig:', {
      type: restaurant.posConfig.type,
      hasClientId: !!restaurant.posConfig.clientId,
      hasEncryptedClientSecret: !!restaurant.posConfig.encryptedClientSecret,
      hasLocationId: !!restaurant.posConfig.locationId,
      clientIdValue: restaurant.posConfig.clientId?.substring(0, 20) + '...',
      encryptedClientSecretValue: restaurant.posConfig.encryptedClientSecret?.substring(0, 20) + '...',
      locationIdValue: restaurant.posConfig.locationId
    });

    await restaurant.save();

    // Re-fetch to verify
    const savedRestaurant = await Restaurant.findById(restaurant._id);
    console.log('After save verification:', {
      hasClientId: !!savedRestaurant?.posConfig?.clientId,
      hasEncryptedClientSecret: !!savedRestaurant?.posConfig?.encryptedClientSecret,
      hasLocationId: !!savedRestaurant?.posConfig?.locationId,
      encryptedClientSecretValue: savedRestaurant?.posConfig?.encryptedClientSecret?.substring(0, 20) + '...'
    });

    console.log(`✅ Toast connection initiated for restaurant ${user.restaurantId}`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Sync type: ${fullSync ? 'full' : 'incremental'}`);
    console.log(`   Date range: ${startDate.toISOString()} to ${now.toISOString()}`);
    console.log(`   Config saved:`, {
      hasClientId: !!restaurant.posConfig?.clientId,
      hasEncryptedSecret: !!restaurant.posConfig?.encryptedClientSecret,
      hasLocationId: !!restaurant.posConfig?.locationId,
      locationId: restaurant.posConfig?.locationId
    });

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
 * DELETE /api/pos/toast/connect
 * Disconnect Toast POS
 */
export async function DELETE(request: NextRequest) {
  const authCheck = await authorize('pos:manage', 'delete')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user } = authCheck;

  try {
    await connectDB();

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Clear POS configuration
    restaurant.posConfig = {
      type: POSSystemType.OTHER,
      isConnected: false,
      isActive: false
    };

    await restaurant.save();

    console.log(`❌ Toast POS disconnected for restaurant ${user.restaurantId}`);

    return NextResponse.json({
      success: true,
      message: 'Toast POS disconnected successfully'
    });

  } catch (error: any) {
    console.error('Error disconnecting Toast:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Toast POS' },
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

    // Check if credentials are properly configured for import
    const hasRequiredCredentials = !!(
      restaurant.posConfig?.clientId &&
      restaurant.posConfig?.encryptedClientSecret &&
      restaurant.posConfig?.locationId
    );

    return NextResponse.json({
      success: true,
      data: {
        isConnected,
        posType: restaurant.posConfig?.type,
        lastSyncAt: lastSyncAt?.toISOString(),
        locationId: restaurant.posConfig?.locationId,
        syncInterval: restaurant.posConfig?.syncInterval || 'manual',
        hasRequiredCredentials,
        debug: {
          hasClientId: !!restaurant.posConfig?.clientId,
          hasEncryptedSecret: !!restaurant.posConfig?.encryptedClientSecret,
          hasLocationId: !!restaurant.posConfig?.locationId
        }
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
