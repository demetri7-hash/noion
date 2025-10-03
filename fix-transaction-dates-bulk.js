/**
 * Fix Transaction Dates (Bulk Update - FAST)
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function fixTransactionDatesBulk() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Find all transactions with invalid dates (before 2020)
    const invalidDateThreshold = new Date('2020-01-01');

    console.log('Finding transactions with invalid dates...');
    const count = await transactions.countDocuments({
      transactionDate: { $lt: invalidDateThreshold }
    });

    console.log(`Found ${count} transactions with invalid dates\n`);

    if (count === 0) {
      console.log('No transactions to fix!');
      process.exit(0);
    }

    // Use aggregation pipeline to bulk update
    console.log('Performing bulk update...');

    const result = await transactions.updateMany(
      { transactionDate: { $lt: invalidDateThreshold } },
      [
        {
          $set: {
            transactionDate: { $ifNull: ['$timing.orderStartedAt', '$createdAt'] }
          }
        }
      ]
    );

    console.log(`\n✅ Bulk update complete!`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    // Verify the fix
    const stillInvalid = await transactions.countDocuments({
      transactionDate: { $lt: invalidDateThreshold }
    });

    console.log(`\nRemaining invalid dates: ${stillInvalid}`);

    if (stillInvalid === 0) {
      console.log('🎉 All transaction dates fixed!');
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTransactionDatesBulk();
