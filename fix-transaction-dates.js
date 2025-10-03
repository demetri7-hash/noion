/**
 * Fix Transaction Dates
 *
 * Updates all transactions with invalid transactionDate (1970) to use timing.orderStartedAt instead
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function fixTransactionDates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Find all transactions with invalid dates (before 2020)
    const invalidDateThreshold = new Date('2020-01-01');

    console.log('Finding transactions with invalid dates...');
    const invalidTransactions = await transactions.find({
      transactionDate: { $lt: invalidDateThreshold }
    }).toArray();

    console.log(`Found ${invalidTransactions.length} transactions with invalid dates\n`);

    if (invalidTransactions.length === 0) {
      console.log('No transactions to fix!');
      process.exit(0);
    }

    // Update each transaction
    let fixed = 0;
    let failed = 0;

    for (const tx of invalidTransactions) {
      try {
        // Use timing.orderStartedAt as the correct date
        if (tx.timing && tx.timing.orderStartedAt) {
          await transactions.updateOne(
            { _id: tx._id },
            { $set: { transactionDate: tx.timing.orderStartedAt } }
          );
          fixed++;

          if (fixed % 100 === 0) {
            console.log(`Fixed ${fixed}/${invalidTransactions.length} transactions...`);
          }
        } else {
          console.log(`⚠️ Transaction ${tx._id} has no timing.orderStartedAt, skipping`);
          failed++;
        }
      } catch (error) {
        console.error(`Failed to update transaction ${tx._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${invalidTransactions.length}`);

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

fixTransactionDates();
