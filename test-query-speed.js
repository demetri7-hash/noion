require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

mongoose.connect(dbUrl)
  .then(async () => {
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));

    const restaurantId = '68dec8baa7518fdbcf72a0b0';

    console.log('\n⏱️  Testing Query Performance...\n');

    // Test 1: Count transactions
    const start1 = Date.now();
    const count = await Transaction.countDocuments({ restaurantId });
    const time1 = Date.now() - start1;
    console.log(`✓ Count transactions: ${count} (${time1}ms)`);

    // Test 2: Find transactions for last 30 days
    const start2 = Date.now();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const currentTransactions = await Transaction.find({
      restaurantId,
      transactionDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'voided' }
    });
    const time2 = Date.now() - start2;
    console.log(`✓ Find 30d transactions: ${currentTransactions.length} found (${time2}ms)`);

    // Test 3: Find previous period
    const start3 = Date.now();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    const previousTransactions = await Transaction.find({
      restaurantId,
      transactionDate: { $gte: previousStartDate, $lte: previousEndDate },
      status: { $ne: 'voided' }
    });
    const time3 = Date.now() - start3;
    console.log(`✓ Find previous period: ${previousTransactions.length} found (${time3}ms)`);

    // Test 4: Check indexes
    const start4 = Date.now();
    const indexes = await Transaction.collection.indexes();
    const time4 = Date.now() - start4;
    console.log(`\n📊 Indexes on Transaction collection (${time4}ms):`);
    indexes.forEach(idx => {
      console.log(`   - ${JSON.stringify(idx.key)}`);
    });

    const totalTime = Date.now() - start1;
    console.log(`\n⏱️  Total time: ${totalTime}ms`);

    if (totalTime > 5000) {
      console.log('\n⚠️  SLOW! Queries taking over 5 seconds - need to add indexes!\n');
    } else {
      console.log('\n✅ Performance looks good!\n');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
