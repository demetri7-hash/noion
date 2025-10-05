/**
 * Clear Toast Transaction Data
 *
 * Deletes ALL transactions for a restaurant to allow fresh full historical sync.
 * Also resets sync metadata.
 *
 * ⚠️ WARNING: This permanently deletes transaction data. Use with caution.
 *
 * Usage: DATABASE_URL=xxx npx tsx scripts/clear-toast-data.ts <restaurantId>
 */

import mongoose from 'mongoose';
import { Transaction, Restaurant } from '../src/models';
import * as readline from 'readline';

async function clearToastData() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Usage: npx tsx clear-toast-data.ts <restaurantId>');
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

    // Count existing transactions
    const count = await Transaction.countDocuments({
      restaurantId: new mongoose.Types.ObjectId(restaurantId)
    });

    console.log('═'.repeat(80));
    console.log(`⚠️  WARNING: DESTRUCTIVE OPERATION`);
    console.log('═'.repeat(80));
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Transactions to delete: ${count.toLocaleString()}`);
    console.log();

    if (count === 0) {
      console.log('✅ No transactions to delete');
      await mongoose.disconnect();
      return;
    }

    // Confirmation prompt
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "DELETE" to confirm deletion: ', resolve);
    });

    rl.close();

    if (answer !== 'DELETE') {
      console.log('❌ Cancelled');
      await mongoose.disconnect();
      return;
    }

    console.log();
    console.log('🗑️  Deleting transactions...');

    // Delete all transactions
    const result = await Transaction.deleteMany({
      restaurantId: new mongoose.Types.ObjectId(restaurantId)
    });

    console.log(`✅ Deleted ${result.deletedCount.toLocaleString()} transactions`);

    // Reset sync metadata
    console.log('🔄 Resetting sync metadata...');
    restaurant.posConfig.lastSyncAt = undefined;
    (restaurant.posConfig as any).initialSyncComplete = false;
    await restaurant.save();

    console.log('✅ Sync metadata reset');

    console.log();
    console.log('═'.repeat(80));
    console.log('✅ CLEANUP COMPLETE');
    console.log('═'.repeat(80));
    console.log();
    console.log('💡 Next step: Run initial sync');
    console.log(`   DATABASE_URL=xxx ENCRYPTION_KEY=xxx npx tsx scripts/run-smart-toast-sync.ts ${restaurantId}`);
    console.log();

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearToastData();
