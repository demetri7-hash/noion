/**
 * Full Historical Sync from Toast POS
 *
 * Syncs ALL available historical data (up to 1 year)
 * Run this once to get complete data, then use incremental syncs
 *
 * Usage: DATABASE_URL=xxx ENCRYPTION_KEY=xxx npx tsx scripts/sync-toast-full-history.ts <restaurantId>
 */

import mongoose from 'mongoose';
import { Restaurant } from '../src/models';
import { toastIntegration } from '../src/services/ToastIntegration';
import { decryptToastCredentials } from '../src/utils/toastEncryption';

async function syncFullHistory() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Usage: npx tsx sync-toast-full-history.ts <restaurantId>');
    process.exit(1);
  }

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      console.error('❌ Restaurant not found');
      process.exit(1);
    }

    console.log('═'.repeat(80));
    console.log(`🔄 FULL HISTORICAL SYNC: ${restaurant.name}`);
    console.log('═'.repeat(80));

    // Verify Toast credentials
    if (!restaurant.posConfig?.clientId || !restaurant.posConfig?.encryptedClientSecret || !restaurant.posConfig?.locationId) {
      console.error('❌ Toast credentials not configured');
      process.exit(1);
    }

    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
      locationId: restaurant.posConfig.locationId
    });

    // Authenticate
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
      console.error('❌ Toast authentication failed');
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken || tokenData.access_token;
    console.log('✅ Authenticated\n');

    // Sync in 30-day chunks (Toast API limitation)
    // Go back 365 days (1 year of history)
    const totalDays = 365;
    const chunkSize = 30;
    const chunks = Math.ceil(totalDays / chunkSize);

    let totalSynced = 0;
    let totalSkipped = 0;

    console.log(`📅 Syncing ${totalDays} days of history in ${chunks} chunks...\n`);

    for (let i = 0; i < chunks; i++) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (i * chunkSize));

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - chunkSize);

      console.log(`\nChunk ${i + 1}/${chunks}: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

      try {
        const transactions = await toastIntegration.fetchTransactions(
          restaurantId,
          startDate,
          endDate
        );

        console.log(`  📥 Fetched ${transactions.length} transactions from Toast`);

        if (transactions.length > 0) {
          const imported = await toastIntegration.importTransactions(restaurantId, transactions);
          const skipped = transactions.length - imported;

          totalSynced += imported;
          totalSkipped += skipped;

          console.log(`  ✅ Imported ${imported} new transactions (${skipped} duplicates skipped)`);
        } else {
          console.log(`  ⚠️  No transactions found for this period`);
        }

        // Rate limiting - wait 1 second between chunks
        if (i < chunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        console.error(`  ❌ Error syncing chunk ${i + 1}:`, error.message);
        // Continue with next chunk
      }
    }

    // Update last sync time
    restaurant.posConfig.lastSyncAt = new Date();
    await restaurant.save();

    console.log('\n' + '═'.repeat(80));
    console.log('✅ FULL HISTORICAL SYNC COMPLETE');
    console.log('═'.repeat(80));
    console.log(`\nTotal Transactions Imported: ${totalSynced}`);
    console.log(`Duplicates Skipped: ${totalSkipped}`);
    console.log(`Historical Period: ${totalDays} days`);
    console.log('\n💡 Next Steps:');
    console.log('   - Set up daily incremental sync (cron job)');
    console.log('   - Run correlation discovery');
    console.log('   - Generate predictions\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

syncFullHistory();
