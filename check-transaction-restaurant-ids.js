require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

mongoose.connect(dbUrl)
  .then(async () => {
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

    // Get sample transactions
    const samples = await Transaction.find().limit(5);

    console.log('\n📋 Sample Transactions:\n');
    samples.forEach((t, idx) => {
      console.log(`${idx + 1}. Transaction ID: ${t._id}`);
      console.log(`   Restaurant ID: ${t.restaurantId} (type: ${typeof t.restaurantId})`);
      console.log(`   POS Transaction ID: ${t.posTransactionId || 'N/A'}`);
      console.log(`   Date: ${t.transactionDate}`);
      console.log(`   Amount: $${t.totalAmount}`);
      console.log('');
    });

    // Get unique restaurant IDs
    const uniqueRestaurantIds = await Transaction.distinct('restaurantId');
    console.log(`\n🏪 Unique Restaurant IDs in transactions: ${uniqueRestaurantIds.length}`);
    uniqueRestaurantIds.forEach(id => {
      console.log(`   - ${id} (type: ${typeof id})`);
    });

    // Count by restaurant
    const counts = await Transaction.aggregate([
      { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Transaction counts by restaurant:');
    counts.forEach(c => {
      console.log(`   ${c._id}: ${c.count} transactions`);
    });

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
