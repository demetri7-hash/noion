/**
 * Simple script to delete all transactions (no Redis needed)
 */
import mongoose from 'mongoose';
import { Transaction } from '../src/models';

async function deleteTransactions() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const count = await Transaction.countDocuments({ restaurantId });
    console.log(`📊 Found ${count.toLocaleString()} transactions\n`);

    if (count === 0) {
      console.log('✅ No transactions to delete');
      return;
    }

    console.log('🗑️  Deleting transactions...');
    const result = await Transaction.deleteMany({ restaurantId });
    console.log(`✅ Deleted ${result.deletedCount.toLocaleString()} transactions\n`);

    console.log('💡 Next step: Go to the POS page in your web app and click "Sync Now"');
    console.log('   This will pull fresh data with real menu item names!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

deleteTransactions();
