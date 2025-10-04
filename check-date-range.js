require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

mongoose.connect(dbUrl)
  .then(async () => {
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

    const restaurantId = new mongoose.Types.ObjectId('68dec8baa7518fdbcf72a0b0');

    // Last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`\n📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

    // Measure query time
    const start = Date.now();
    const transactions = await Transaction.find({
      restaurantId,
      transactionDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'voided' }
    });
    const time = Date.now() - start;

    console.log(`Found ${transactions.length} transactions in ${time}ms`);

    // Check all transaction dates
    const allTransactions = await Transaction.find({ restaurantId }).limit(10).sort({ transactionDate: 1 });
    console.log(`\n📊 Sample transaction dates (oldest):`);
    allTransactions.forEach(t => {
      console.log(`   ${t.transactionDate}`);
    });

    const newestTransactions = await Transaction.find({ restaurantId }).limit(10).sort({ transactionDate: -1 });
    console.log(`\n📊 Sample transaction dates (newest):`);
    newestTransactions.forEach(t => {
      console.log(`   ${t.transactionDate}`);
    });

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
