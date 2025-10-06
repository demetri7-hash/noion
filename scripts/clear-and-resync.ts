/**
 * Clear old transaction data and trigger re-sync with fixed menu item names
 */
import mongoose from 'mongoose';
import { Transaction } from '../src/models';
import { enqueueSyncJob } from '../src/lib/mongoQueue';

async function clearAndResync() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Count existing transactions
    const count = await Transaction.countDocuments({ restaurantId });
    console.log(`📊 Found ${count.toLocaleString()} existing transactions with bad data\n`);

    // Delete all existing transactions
    console.log('🗑️  Deleting old transactions...');
    const result = await Transaction.deleteMany({ restaurantId });
    console.log(`✅ Deleted ${result.deletedCount.toLocaleString()} transactions\n`);

    // Enqueue a fresh sync job
    console.log('🔄 Enqueuing fresh sync job...');

    // Sync last 90 days of data
    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const jobId = await enqueueSyncJob({
      restaurantId,
      posType: 'toast',
      options: {
        startDate,
        endDate,
        fullSync: true
      }
    });

    console.log(`✅ Sync job enqueued: ${jobId}`);
    console.log(`   Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log('\n⏳ Worker will process this job and pull fresh data with real menu item names');
    console.log('   Check Railway logs to monitor progress\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

clearAndResync();
