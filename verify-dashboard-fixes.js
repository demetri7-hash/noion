/**
 * Verify Dashboard Fixes
 *
 * Checks:
 * 1. Insights are queryable with 'generated' status
 * 2. Peak hours show correct UTC times (should be 18-23 for dinner service)
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function verifyFixes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;

    // 1. Check insights with 'generated' status
    console.log('=== INSIGHT STATUS FIX ===');
    const insights = await db.collection('insights').find({
      status: { $in: ['generated', 'sent', 'viewed'] }
    }).toArray();

    console.log(`Found ${insights.length} insights with correct statuses`);
    if (insights.length > 0) {
      console.log('\nFirst insight:');
      console.log(`  ID: ${insights[0]._id}`);
      console.log(`  Title: ${insights[0].title}`);
      console.log(`  Status: ${insights[0].status}`);
      console.log(`  Revenue Opportunity: $${insights[0].lostRevenue?.total || 0}`);
      console.log(`  ✅ Dashboard should now show this insight!`);
    }

    // 2. Check peak hours (should show dinner service 18-23 UTC)
    console.log('\n=== PEAK HOURS FIX ===');
    const hourDistribution = await db.collection('transactions').aggregate([
      {
        $group: {
          _id: '$analytics.hourOfDay',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    console.log('Top 5 hours by order count:');
    hourDistribution.forEach((h, i) => {
      const hour = h._id;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      console.log(`  ${i + 1}. ${displayHour}:00 ${period} (${hour}:00 UTC) - ${h.count} orders`);
    });

    const topHour = hourDistribution[0]._id;
    if (topHour >= 18 || topHour <= 3) {
      console.log('\n  ✅ Peak hours look correct (dinner/evening service)');
    } else {
      console.log('\n  ⚠️ Peak hours might still be incorrect');
    }

    // 3. Sample a transaction to verify UTC conversion
    console.log('\n=== SAMPLE TRANSACTION ===');
    const sampleTx = await db.collection('transactions').findOne({});
    if (sampleTx) {
      const txDate = new Date(sampleTx.transactionDate);
      const utcHour = txDate.getUTCHours();
      const storedHour = sampleTx.analytics.hourOfDay;

      console.log(`Transaction Date: ${sampleTx.transactionDate}`);
      console.log(`UTC Hour (calculated): ${utcHour}`);
      console.log(`Stored Hour: ${storedHour}`);

      if (utcHour === storedHour) {
        console.log('✅ Timezone fix verified - hours match!');
      } else {
        console.log('⚠️ Hours do not match - may need to re-run migration');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Verification complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyFixes();
