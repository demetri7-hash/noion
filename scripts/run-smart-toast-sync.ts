/**
 * Run Smart Toast Sync
 *
 * Automatically detects if restaurant needs initial or incremental sync
 * and executes it with progress updates.
 *
 * NO TIMEOUT - Runs as long as needed
 *
 * Usage: DATABASE_URL=xxx ENCRYPTION_KEY=xxx npx tsx scripts/run-smart-toast-sync.ts <restaurantId>
 */

import mongoose from 'mongoose';
import { smartToastSync, SyncProgress } from '../src/services/SmartToastSync';
import { Restaurant } from '../src/models';

async function runSmartSync() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Usage: npx tsx run-smart-toast-sync.ts <restaurantId>');
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
    console.log(`🔄 SMART TOAST SYNC: ${restaurant.name}`);
    console.log('═'.repeat(80));
    console.log();

    // Progress callback for real-time updates
    const progressCallback = (progress: SyncProgress) => {
      const bar = '█'.repeat(Math.floor(progress.percentComplete / 2)) +
                  '░'.repeat(50 - Math.floor(progress.percentComplete / 2));

      console.log(`\r[${bar}] ${progress.percentComplete.toFixed(1)}% | ` +
                  `Chunk ${progress.currentChunk}/${progress.totalChunks} | ` +
                  `${progress.totalImported.toLocaleString()} imported | ` +
                  `~${Math.ceil(progress.estimatedTimeRemaining)}min remaining`);

      if (progress.message) {
        console.log(`   ${progress.message}`);
      }
    };

    // Execute smart sync (automatically chooses initial vs incremental)
    await smartToastSync.smartSync(restaurantId, progressCallback);

    console.log('\n✅ Sync complete!');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSmartSync();
