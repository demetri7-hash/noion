/**
 * Debug hourOfDay Field
 *
 * Check what's actually stored in analytics.hourOfDay
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function debugHourOfDay() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Sample a few transactions to see what's stored
    console.log('=== SAMPLE TRANSACTIONS ===');
    const sample = await transactions.find({}).limit(5).toArray();

    sample.forEach((t, i) => {
      const txDate = new Date(t.transactionDate);
      const calculatedUTCHour = txDate.getUTCHours();
      const storedHour = t.analytics?.hourOfDay;

      console.log(`\nTransaction ${i + 1}:`);
      console.log(`  transactionDate: ${t.transactionDate}`);
      console.log(`  Calculated UTC Hour: ${calculatedUTCHour}`);
      console.log(`  Stored analytics.hourOfDay: ${storedHour}`);
      console.log(`  Match: ${calculatedUTCHour === storedHour ? '✅' : '❌'}`);
      console.log(`  totalAmount: $${t.totalAmount}`);
    });

    // Check distribution
    console.log('\n=== HOUR DISTRIBUTION (Using analytics.hourOfDay) ===');
    const hourDistribution = await transactions.aggregate([
      {
        $group: {
          _id: '$analytics.hourOfDay',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]).toArray();

    hourDistribution.forEach((h, i) => {
      const hour = h._id;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      console.log(`${i + 1}. ${displayHour}:00 ${period} (${hour}:00 UTC) - ${h.count} orders, $${h.totalRevenue.toFixed(2)}`);
    });

    // Check if the migration actually worked
    console.log('\n=== CHECKING MIGRATION SUCCESS ===');
    const mismatchCount = await transactions.countDocuments({
      $expr: {
        $ne: [
          '$analytics.hourOfDay',
          { $hour: { date: '$transactionDate', timezone: 'UTC' } }
        ]
      }
    });

    console.log(`Transactions with mismatched hourOfDay: ${mismatchCount}`);

    if (mismatchCount > 0) {
      console.log('⚠️ Migration did not work correctly. Trying to rerun...');
    } else {
      console.log('✅ All transactions have correct UTC hours');
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugHourOfDay();
