/**
 * Check sync job and restaurant connection status
 * Usage: npx tsx scripts/check-sync-status.ts <restaurantId>
 */

import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';
import SyncJob from '../src/models/SyncJob';

async function checkStatus() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    // Connect to MongoDB
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Find restaurant
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.error(`❌ Restaurant not found: ${restaurantId}`);
      process.exit(1);
    }

    console.log('📊 Restaurant Status:');
    console.log('   Name:', restaurant.name);
    console.log('   POS Type:', restaurant.posConfig?.type);
    console.log('   Is Connected:', restaurant.posConfig?.isConnected ? '✅ YES' : '❌ NO');
    console.log('   Is Active:', restaurant.posConfig?.isActive ? '✅ YES' : '❌ NO');
    console.log('   Last Sync:', restaurant.posConfig?.lastSyncAt?.toISOString() || 'Never');

    // Find sync jobs for this restaurant
    const syncJobs = await SyncJob.find({ restaurantId })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('\n📋 Recent Sync Jobs (last 5):');

    if (syncJobs.length === 0) {
      console.log('   No sync jobs found');
    } else {
      syncJobs.forEach((job, index) => {
        console.log(`\n   ${index + 1}. Job ID: ${job.jobId}`);
        console.log(`      Status: ${getStatusEmoji(job.status)} ${job.status.toUpperCase()}`);
        console.log(`      Created: ${job.createdAt.toISOString()}`);
        console.log(`      Started: ${job.startedAt?.toISOString() || 'Not started'}`);
        console.log(`      Completed: ${job.completedAt?.toISOString() || 'Not completed'}`);
        console.log(`      Attempts: ${job.attempts}/${job.maxAttempts}`);

        if (job.progress) {
          console.log(`      Progress: ${job.progress.ordersProcessed || 0} orders processed`);
        }

        if (job.result) {
          console.log(`      Result: ${job.result.ordersImported} orders imported in ${job.result.duration}ms`);
        }

        if (job.error) {
          console.log(`      Error: ${job.error.message}`);
        }
      });
    }

    // Check the specific job from logs
    const specificJob = await SyncJob.findOne({
      jobId: 'sync-68e0bd8a603ef36c8257e021-1759638749876'
    });

    if (specificJob) {
      console.log('\n🔍 Latest Sync Job (from logs):');
      console.log(`   Job ID: ${specificJob.jobId}`);
      console.log(`   Status: ${getStatusEmoji(specificJob.status)} ${specificJob.status.toUpperCase()}`);
      console.log(`   Created: ${specificJob.createdAt.toISOString()}`);
      console.log(`   Started: ${specificJob.startedAt?.toISOString() || 'Not started yet'}`);
      console.log(`   Completed: ${specificJob.completedAt?.toISOString() || 'Not completed yet'}`);

      if (specificJob.progress) {
        console.log(`   Orders Processed: ${specificJob.progress.ordersProcessed || 0}`);
        console.log(`   Pages Processed: ${specificJob.progress.pagesProcessed || 0}/${specificJob.progress.totalPages || '?'}`);
      }

      if (specificJob.result) {
        console.log(`   ✅ Result: ${specificJob.result.ordersImported} orders imported in ${specificJob.result.duration}ms`);
      }

      if (specificJob.error) {
        console.log(`   ❌ Error: ${specificJob.error.message}`);
      }
    }

    console.log('\n✅ Status check complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'processing': return '⏳';
    case 'failed': return '❌';
    case 'pending': return '⏸️';
    default: return '❓';
  }
}

checkStatus();
