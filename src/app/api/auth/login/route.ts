import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AuthService } from '@/services/AuthService';
import { decryptToastCredentials } from '@/utils/toastEncryption';
import { enqueueSyncJob } from '@/lib/queue';
import SyncJob from '@/models/SyncJob';
import { POSSystemType } from '@/models/Restaurant';

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.login(email, password);

    // Check if login was successful
    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Auto-sync Toast data if configured
    try {
      await handleAutoSync(result.user);
    } catch (error) {
      console.error('Auto-sync failed (non-blocking):', error);
      // Don't fail login if auto-sync fails
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });

    // Set HTTP-only cookie for refresh token
    if (result.refreshToken) {
      response.cookies.set('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid credentials' || error.message === 'User not found') {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle automatic Toast POS sync on login
 * If user has Toast credentials stored with syncInterval='on_login',
 * automatically trigger a sync job to pull new data since last login
 */
async function handleAutoSync(user: any): Promise<void> {
  // Check if user has Toast POS configured
  const posConfig = user.posConfig;

  if (!posConfig || posConfig.type !== POSSystemType.TOAST) {
    return; // No Toast POS configured
  }

  if (posConfig.syncInterval !== 'on_login') {
    return; // Auto-sync not enabled
  }

  if (!posConfig.isActive || !posConfig.clientId || !posConfig.encryptedClientSecret) {
    return; // Missing credentials
  }

  console.log(`🔄 Auto-sync triggered for restaurant ${user._id}`);

  try {
    // Decrypt stored credentials
    const credentials = decryptToastCredentials({
      clientId: posConfig.clientId,
      encryptedClientSecret: posConfig.encryptedClientSecret,
      locationId: posConfig.locationId
    });

    // Determine sync date range
    const lastSyncDate = posConfig.lastSyncAt;
    const now = new Date();

    let startDate: Date;
    let fullSync: boolean;

    if (lastSyncDate) {
      // Incremental sync: only get data since last sync
      startDate = new Date(lastSyncDate);
      fullSync = false;
      console.log(`   Incremental sync from ${startDate.toISOString()}`);
    } else {
      // First-time sync: get last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fullSync = true;
      console.log('   First-time sync: last 30 days');
    }

    // Enqueue background sync job
    const jobId = await enqueueSyncJob({
      restaurantId: String(user._id),
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
      notificationEmail: user.owner.email
    });

    // Create SyncJob record
    await SyncJob.create({
      restaurantId: user._id,
      posType: 'toast',
      status: 'pending',
      jobId,
      notificationEmail: user.owner.email,
      maxAttempts: 3
    });

    console.log(`✅ Auto-sync job enqueued: ${jobId}`);
    console.log(`   Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

  } catch (error) {
    console.error('Failed to trigger auto-sync:', error);
    throw error;
  }
}
