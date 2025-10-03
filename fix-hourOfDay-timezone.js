/**
 * Fix Transaction Hour of Day - Timezone Correction
 *
 * Updates all transactions to use UTC hours instead of server local time
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function fixHourOfDay() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Count total transactions
    const totalCount = await transactions.countDocuments();
    console.log(`Found ${totalCount} total transactions\n`);

    // Use aggregation pipeline to bulk update hourOfDay
    console.log('Performing bulk update to fix hourOfDay timezone...');

    const result = await transactions.updateMany(
      {},
      [
        {
          $set: {
            'analytics.hourOfDay': {
              $hour: {
                date: '$transactionDate',
                timezone: 'UTC'
              }
            }
          }
        }
      ]
    );

    console.log(`\n✅ Bulk update complete!`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    // Verify the fix by checking distribution of hours
    console.log('\n📊 Hour distribution after fix:');
    const hourDistribution = await transactions.aggregate([
      {
        $group: {
          _id: '$analytics.hourOfDay',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totals.netAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]).toArray();

    console.log('\nTop 10 hours by revenue:');
    hourDistribution.forEach(h => {
      console.log(`   ${h._id}:00 - ${h.count} orders, $${h.totalRevenue.toFixed(2)}`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixHourOfDay();
