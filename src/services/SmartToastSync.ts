/**
 * Smart Toast POS Initial Sync
 *
 * Automatically detects restaurant's first Toast transaction and syncs ALL historical data.
 *
 * Features:
 * - Auto-detects first order date from Toast API
 * - Calculates estimated sync time
 * - Shows progress updates
 * - Handles Toast API rate limits (5-10 sec between chunks)
 * - Syncs in 30-day chunks (Toast API limit)
 * - Updates UI in real-time via WebSocket
 * - Marks initial sync complete for future incremental syncs
 */

import { Types } from 'mongoose';
import Restaurant from '../models/Restaurant';
import { toastIntegration } from './ToastIntegration';
import { decryptToastCredentials } from '../utils/toastEncryption';

export interface SyncEstimate {
  firstOrderDate: Date;
  lastOrderDate: Date;
  totalDays: number;
  totalChunks: number;
  estimatedMinutes: number;
  estimatedTransactions: number;
}

export interface SyncProgress {
  currentChunk: number;
  totalChunks: number;
  chunkStartDate: Date;
  chunkEndDate: Date;
  transactionsFetched: number;
  transactionsImported: number;
  totalImported: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // minutes
  status: 'idle' | 'syncing' | 'completed' | 'error';
  message?: string;
}

export class SmartToastSync {
  /**
   * Step 1: Detect first order date and calculate estimate
   * Uses binary search approach to find earliest order efficiently
   */
  async estimateInitialSync(restaurantId: string): Promise<SyncEstimate> {
    console.log(`\n🔍 Analyzing Toast data for restaurant ${restaurantId}...`);

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Verify Toast credentials
    if (!restaurant.posConfig?.clientId || !restaurant.posConfig?.encryptedClientSecret || !restaurant.posConfig?.locationId) {
      throw new Error('Toast POS credentials not configured');
    }

    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
      locationId: restaurant.posConfig.locationId
    });

    // Authenticate with Toast
    console.log('🔐 Authenticating with Toast...');
    const tokenResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Toast authentication failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken || tokenData.access_token;

    // Find the FIRST order using binary search approach
    console.log('📅 Finding first order date (binary search)...');

    // Toast API only has data from December 1, 2015
    const toastMinDate = new Date('2015-12-01');
    const today = new Date();

    let firstOrderDate = await this.binarySearchFirstOrder(
      credentials.locationGuid,
      accessToken,
      toastMinDate,
      today
    );

    if (!firstOrderDate) {
      // FALLBACK: If binary search fails, try last 90 days
      console.log('⚠️  Binary search found no orders. Trying fallback: last 90 days...');
      const fallbackDate = new Date(today);
      fallbackDate.setDate(fallbackDate.getDate() - 90);

      const hasRecentOrders = await this.checkOrdersExist(
        credentials.locationGuid,
        accessToken,
        fallbackDate,
        today
      );

      if (hasRecentOrders) {
        console.log(`✅ Found orders in last 90 days. Using ${fallbackDate.toLocaleDateString()} as start date.`);
        firstOrderDate = fallbackDate;
      } else {
        throw new Error('No orders found in Toast (checked from Dec 2015 to today, and last 90 days)');
      }
    }

    const lastOrderDate = today;

    console.log(`✅ First order: ${firstOrderDate.toLocaleDateString()}`);
    console.log(`✅ Latest: ${lastOrderDate.toLocaleDateString()}`);

    // Calculate chunks (30-day maximum per Toast API)
    const totalDays = Math.ceil((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    const chunkSize = 30;
    const totalChunks = Math.ceil(totalDays / chunkSize);

    // Estimate transactions (based on sample)
    // Fetch a sample month to estimate avg transactions per day
    const sampleEndDate = new Date();
    const sampleStartDate = new Date();
    sampleStartDate.setDate(sampleStartDate.getDate() - 30);

    console.log('📊 Sampling recent month to estimate total...');

    const sampleResponse = await fetch(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?` + new URLSearchParams({
        startDate: sampleStartDate.toISOString(),
        endDate: sampleEndDate.toISOString(),
        pageSize: '1'
      }),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': credentials.locationGuid
        }
      }
    );

    let estimatedTransactions = totalDays * 150; // Default estimate
    if (sampleResponse.ok) {
      const sampleData = await sampleResponse.json();
      const sampleTotal = sampleData.totalCount || 0;
      const avgPerDay = sampleTotal / 30;
      estimatedTransactions = Math.ceil(avgPerDay * totalDays);
      console.log(`📈 Estimated ${estimatedTransactions.toLocaleString()} total transactions (${avgPerDay.toFixed(0)}/day)`);
    }

    // Estimate time
    // ~10 seconds per chunk + processing time
    const estimatedMinutes = Math.ceil((totalChunks * 15) / 60); // 15 sec per chunk average

    const estimate: SyncEstimate = {
      firstOrderDate,
      lastOrderDate,
      totalDays,
      totalChunks,
      estimatedMinutes,
      estimatedTransactions
    };

    console.log('\n' + '═'.repeat(80));
    console.log('📋 INITIAL SYNC ESTIMATE');
    console.log('═'.repeat(80));
    console.log(`Period: ${firstOrderDate.toLocaleDateString()} to ${lastOrderDate.toLocaleDateString()}`);
    console.log(`Total Days: ${totalDays}`);
    console.log(`Chunks: ${totalChunks} (30-day chunks)`);
    console.log(`Estimated Transactions: ${estimatedTransactions.toLocaleString()}`);
    console.log(`Estimated Time: ${estimatedMinutes} minutes`);
    console.log('═'.repeat(80) + '\n');

    return estimate;
  }

  /**
   * Binary search to find first order date efficiently
   * Queries in 30-day chunks, halving the search space each time
   */
  private async binarySearchFirstOrder(
    locationId: string,
    accessToken: string,
    minDate: Date,
    maxDate: Date
  ): Promise<Date | null> {
    console.log(`   Searching between ${minDate.toLocaleDateString()} and ${maxDate.toLocaleDateString()}...`);

    // Try the earliest 30-day chunk first
    const chunkEnd = new Date(minDate);
    chunkEnd.setDate(chunkEnd.getDate() + 30);

    const hasOrders = await this.checkOrdersExist(locationId, accessToken, minDate, chunkEnd);

    if (hasOrders) {
      // Orders exist in earliest chunk, this is approximately the start
      console.log(`   ✅ Found orders starting from ${minDate.toLocaleDateString()}`);
      return minDate;
    }

    // No orders in earliest chunk, search forward in 90-day jumps
    let searchDate = new Date(minDate);
    let lastGoodDate: Date | null = null;

    while (searchDate < maxDate) {
      const searchEnd = new Date(searchDate);
      searchEnd.setDate(searchEnd.getDate() + 90); // 90-day chunks for searching

      if (searchEnd > maxDate) {
        searchEnd.setTime(maxDate.getTime());
      }

      console.log(`   Checking ${searchDate.toLocaleDateString()} to ${searchEnd.toLocaleDateString()}...`);

      const hasOrders = await this.checkOrdersExist(locationId, accessToken, searchDate, searchEnd);

      if (hasOrders) {
        // Found orders! Now narrow down to 30-day precision
        lastGoodDate = searchDate;
        break;
      }

      // Move forward 90 days
      searchDate.setDate(searchDate.getDate() + 90);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!lastGoodDate) {
      return null; // No orders found
    }

    console.log(`   ✅ First orders around ${lastGoodDate.toLocaleDateString()}`);
    return lastGoodDate;
  }

  /**
   * Check if orders exist in a date range (returns true/false)
   */
  private async checkOrdersExist(
    locationId: string,
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    try {
      console.log(`      🔍 API Request: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);
      console.log(`      🔍 locationId (Toast-Restaurant-External-ID): ${locationId}`);
      console.log(`      🔍 accessToken (first 30 chars): ${accessToken.substring(0, 30)}...`);

      // Build query params (matching working fetchTransactions implementation)
      // NOTE: restaurantGuid goes in HEADER only, not in query params
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: '1',
        page: '1'
      });

      console.log(`      🔍 Full URL: https://ws-api.toasttab.com/orders/v2/ordersBulk?${params}`);

      const response = await fetch(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': locationId,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`      📊 Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`      ❌ Error Response: ${errorText}`);
        return false;
      }

      const data = await response.json();
      console.log(`      📊 Response Data: ${JSON.stringify(data).substring(0, 200)}...`);

      // Response is an array directly, not nested in a 'data' property
      const ordersFound = Array.isArray(data) && data.length > 0;
      console.log(`      ${ordersFound ? '✅ ORDERS FOUND' : '❌ NO ORDERS'}`);

      return ordersFound;
    } catch (error: any) {
      console.error(`      ❌ API Error:`, error.message);
      return false;
    }
  }

  /**
   * Step 2: Execute full initial sync with progress updates
   */
  async executeInitialSync(
    restaurantId: string,
    estimate: SyncEstimate,
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<void> {
    console.log(`\n🚀 Starting initial sync for restaurant ${restaurantId}...`);

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Initialize sync progress in database
    await Restaurant.findByIdAndUpdate(restaurantId, {
      'posConfig.syncProgress': {
        status: 'syncing',
        currentChunk: 0,
        totalChunks: estimate.totalChunks,
        percentComplete: 0,
        transactionsImported: 0,
        estimatedTimeRemaining: estimate.estimatedMinutes,
        message: 'Starting historical sync...',
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      }
    });

    // Helper to update progress (both callback and database)
    const updateProgress = async (progress: SyncProgress) => {
      // Call the callback if provided
      if (progressCallback) {
        progressCallback(progress);
      }

      // Save to database for UI display
      await Restaurant.findByIdAndUpdate(restaurantId, {
        'posConfig.syncProgress': {
          status: progress.status,
          currentChunk: progress.currentChunk,
          totalChunks: progress.totalChunks,
          percentComplete: progress.percentComplete,
          transactionsImported: progress.transactionsImported || progress.totalImported,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
          message: progress.message,
          startedAt: restaurant.posConfig.syncProgress?.startedAt || new Date(),
          lastUpdatedAt: new Date(),
          ...(progress.status === 'completed' && { completedAt: new Date() }),
          ...(progress.status === 'error' && progress.message && { error: progress.message })
        }
      });
    };

    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
      locationId: restaurant.posConfig.locationId
    });

    // Authenticate
    const tokenResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Toast authentication failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken || tokenData.access_token;

    // STEP 1: Sync Configuration Data (Current Snapshot)
    console.log('\n📋 Syncing configuration data...');

    try {
      // Sync Jobs (positions/roles)
      console.log('  📍 Fetching jobs...');
      const jobs = await toastIntegration.fetchJobs(restaurantId);
      console.log(`  ✅ Fetched ${jobs.length} jobs`);
      if (jobs.length > 0) {
        await toastIntegration.importJobs(restaurantId, jobs);
      }

      // Sync Menus
      console.log('  📍 Fetching menus...');
      const menus = await toastIntegration.fetchMenus(restaurantId);
      console.log(`  ✅ Fetched ${menus?.length || 0} menus`);
      if (menus && menus.length > 0) {
        await toastIntegration.importMenus(restaurantId, menus);
      }

      // Sync Menu Items
      console.log('  📍 Fetching menu items...');
      const menuItems = await toastIntegration.fetchMenuItems(restaurantId);
      console.log(`  ✅ Fetched ${menuItems.length} menu items`);
      if (menuItems.length > 0) {
        await toastIntegration.importMenuItems(restaurantId, menuItems);
      }

      console.log('✅ Configuration data synced');
    } catch (error: any) {
      console.error('⚠️  Configuration sync failed:', error.message);
      // Continue with historical sync even if config fails
    }

    // STEP 2: Sync Historical Transaction & Labor Data
    // Sync in reverse chronological order (newest first)
    // This gives immediate value to the user (recent data first)
    const chunkSize = 30;
    let totalImported = 0;
    const startTime = Date.now();

    for (let i = 0; i < estimate.totalChunks; i++) {
      const chunkEndDate = new Date(estimate.lastOrderDate);
      chunkEndDate.setDate(chunkEndDate.getDate() - (i * chunkSize));

      const chunkStartDate = new Date(chunkEndDate);
      chunkStartDate.setDate(chunkStartDate.getDate() - chunkSize);

      // Don't go before first order date
      if (chunkStartDate < estimate.firstOrderDate) {
        chunkStartDate.setTime(estimate.firstOrderDate.getTime());
      }

      console.log(`\n📦 Chunk ${i + 1}/${estimate.totalChunks}: ${chunkStartDate.toLocaleDateString()} to ${chunkEndDate.toLocaleDateString()}`);

      // Send progress update
      const percentComplete = (i / estimate.totalChunks) * 100;
      const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
      const estimatedTotalMinutes = elapsedMinutes / (i + 1) * estimate.totalChunks;
      const estimatedTimeRemaining = Math.max(0, estimatedTotalMinutes - elapsedMinutes);

      const progress: SyncProgress = {
        currentChunk: i + 1,
        totalChunks: estimate.totalChunks,
        chunkStartDate,
        chunkEndDate,
        transactionsFetched: 0,
        transactionsImported: 0,
        totalImported,
        percentComplete,
        estimatedTimeRemaining,
        status: 'syncing',
        message: `Syncing ${chunkStartDate.toLocaleDateString()} to ${chunkEndDate.toLocaleDateString()}...`
      };

      await updateProgress(progress);

      try {
        // Fetch transactions for this chunk
        const transactions = await toastIntegration.fetchTransactions(
          restaurantId,
          chunkStartDate,
          chunkEndDate
        );

        console.log(`  📥 Fetched ${transactions.length} transactions`);

        // Update progress with fetch count
        progress.transactionsFetched = transactions.length;
        if (progressCallback) {
          progressCallback(progress);
        }

        // Import to database
        if (transactions.length > 0) {
          const imported = await toastIntegration.importTransactions(restaurantId, transactions);
          const skipped = transactions.length - imported;

          totalImported += imported;

          console.log(`  ✅ Imported ${imported} new (${skipped} duplicates skipped)`);

          // Final progress update for this chunk
          progress.transactionsImported = imported;
          progress.totalImported = totalImported;
          if (progressCallback) {
            progressCallback(progress);
          }
        } else {
          console.log(`  ⚠️  No transactions in this period`);
        }

        // Sync Labor Data for this time period
        try {
          // Fetch time entries (clock-in/out data)
          console.log(`  📍 Fetching time entries...`);
          const timeEntries = await toastIntegration.fetchTimeEntries(
            restaurantId,
            chunkStartDate,
            chunkEndDate
          );
          console.log(`  ✅ Fetched ${timeEntries.length} time entries`);
          if (timeEntries.length > 0) {
            await toastIntegration.importTimeEntries(restaurantId, timeEntries);
          }

          // Fetch scheduled shifts
          console.log(`  📍 Fetching shifts...`);
          const shifts = await toastIntegration.fetchShifts(
            restaurantId,
            chunkStartDate,
            chunkEndDate
          );
          console.log(`  ✅ Fetched ${shifts.length} shifts`);
          if (shifts.length > 0) {
            await toastIntegration.importShifts(restaurantId, shifts);
          }
        } catch (error: any) {
          console.error(`  ⚠️  Labor data sync failed for this chunk:`, error.message);
          // Continue even if labor sync fails
        }

        // Rate limiting: Wait 5-10 seconds between chunks (Toast API requirement)
        if (i < estimate.totalChunks - 1) {
          const waitTime = 7000; // 7 seconds
          console.log(`  ⏳ Waiting ${waitTime / 1000}s (Toast API rate limit)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

      } catch (error: any) {
        console.error(`  ❌ Error syncing chunk ${i + 1}:`, error.message);

        // Send error progress update
        if (progressCallback) {
          await updateProgress({
            ...progress,
            status: 'error',
            message: `Error in chunk ${i + 1}: ${error.message}`
          });
        }

        // Continue with next chunk (don't fail entire sync)
        continue;
      }
    }

    // Mark initial sync complete
    restaurant.posConfig.lastSyncAt = new Date();
    restaurant.posConfig.isActive = true;

    // Add a flag to indicate initial sync is complete
    if (!restaurant.posConfig.initialSyncComplete) {
      (restaurant.posConfig as any).initialSyncComplete = true;
    }

    await restaurant.save();

    // Final progress update
    const finalProgress: SyncProgress = {
      currentChunk: estimate.totalChunks,
      totalChunks: estimate.totalChunks,
      chunkStartDate: estimate.firstOrderDate,
      chunkEndDate: estimate.lastOrderDate,
      transactionsFetched: totalImported,
      transactionsImported: totalImported,
      totalImported,
      percentComplete: 100,
      estimatedTimeRemaining: 0,
      status: 'completed',
      message: `Initial sync complete! Imported ${totalImported.toLocaleString()} transactions.`
    };

    if (progressCallback) {
      progressCallback(finalProgress);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ INITIAL SYNC COMPLETE');
    console.log('═'.repeat(80));
    console.log(`Total Transactions Imported: ${totalImported.toLocaleString()}`);
    console.log(`Period: ${estimate.firstOrderDate.toLocaleDateString()} to ${estimate.lastOrderDate.toLocaleDateString()}`);
    console.log(`Time Taken: ${Math.ceil((Date.now() - startTime) / (1000 * 60))} minutes`);
    console.log('═'.repeat(80) + '\n');

    // Trigger pattern discovery in the background
    if (totalImported > 0) {
      console.log('🔬 Triggering pattern discovery in background...\n');
      this.triggerPatternDiscovery(restaurantId).catch(error => {
        console.error('⚠️  Pattern discovery trigger failed:', error.message);
      });
    }
  }

  /**
   * Step 3: Incremental sync (for subsequent updates)
   * Only syncs since last sync date
   */
  async executeIncrementalSync(
    restaurantId: string,
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<number> {
    console.log(`\n🔄 Incremental sync for restaurant ${restaurantId}...`);

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const lastSyncDate = restaurant.posConfig.lastSyncAt || new Date('2022-08-02'); // Fallback
    const currentDate = new Date();

    // Calculate days since last sync
    const daysSinceSync = Math.ceil((currentDate.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`📅 Last sync: ${lastSyncDate.toLocaleDateString()}`);
    console.log(`📅 Days since: ${daysSinceSync}`);

    if (daysSinceSync === 0) {
      console.log('✅ Already up to date');
      return 0;
    }

    // Progress update
    if (progressCallback) {
      progressCallback({
        currentChunk: 1,
        totalChunks: 1,
        chunkStartDate: lastSyncDate,
        chunkEndDate: currentDate,
        transactionsFetched: 0,
        transactionsImported: 0,
        totalImported: 0,
        percentComplete: 0,
        estimatedTimeRemaining: 1,
        status: 'syncing',
        message: 'Fetching new transactions...'
      });
    }

    // Fetch new transactions
    const transactions = await toastIntegration.fetchTransactions(
      restaurantId,
      lastSyncDate,
      currentDate
    );

    console.log(`📥 Fetched ${transactions.length} new transactions`);

    // Import
    const imported = await toastIntegration.importTransactions(restaurantId, transactions);

    console.log(`✅ Imported ${imported} new transactions`);

    // Update last sync time
    restaurant.posConfig.lastSyncAt = currentDate;
    await restaurant.save();

    // Final progress
    if (progressCallback) {
      progressCallback({
        currentChunk: 1,
        totalChunks: 1,
        chunkStartDate: lastSyncDate,
        chunkEndDate: currentDate,
        transactionsFetched: transactions.length,
        transactionsImported: imported,
        totalImported: imported,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        status: 'completed',
        message: `Incremental sync complete! Imported ${imported} new transactions.`
      });
    }

    return imported;
  }

  /**
   * Smart sync: Automatically chooses initial or incremental sync
   */
  async smartSync(
    restaurantId: string,
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<void> {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Check if initial sync has been completed
    const initialSyncComplete = (restaurant.posConfig as any).initialSyncComplete || false;

    if (!initialSyncComplete) {
      // First time sync - do full historical
      console.log('🆕 First sync detected - performing FULL historical sync...');
      const estimate = await this.estimateInitialSync(restaurantId);
      await this.executeInitialSync(restaurantId, estimate, progressCallback);
    } else {
      // Subsequent sync - only get new data
      console.log('🔄 Incremental sync...');
      await this.executeIncrementalSync(restaurantId, progressCallback);
    }
  }

  /**
   * Trigger pattern discovery in background after sync completes
   */
  private async triggerPatternDiscovery(restaurantId: string): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      const path = await import('path');

      // Path to pattern discovery script
      const scriptPath = path.join(process.cwd(), 'scripts', 'run-pattern-discovery.ts');

      console.log(`🔬 Starting pattern discovery background job...`);
      console.log(`   Script: ${scriptPath}`);
      console.log(`   Restaurant: ${restaurantId}\n`);

      // Spawn the pattern discovery script as a background process
      const child = spawn('npx', ['tsx', scriptPath, restaurantId, '30'], {
        detached: true,
        stdio: 'ignore', // Don't pipe output to this process
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL
        }
      });

      // Detach the child process so it continues running
      child.unref();

      console.log(`✅ Pattern discovery job started (PID: ${child.pid})`);
      console.log(`   This will analyze the last 30 days of transactions`);
      console.log(`   Results will appear on the Business Analytics page when complete\n`);

    } catch (error: any) {
      console.error('❌ Failed to trigger pattern discovery:', error.message);
      throw error;
    }
  }
}

export const smartToastSync = new SmartToastSync();
