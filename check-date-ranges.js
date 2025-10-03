/**
 * Check Transaction Date Ranges
 *
 * Understand why comparison percentages are so high (4912%)
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function checkDateRanges() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Get overall date range
    const dateRange = await transactions.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$transactionDate' },
          maxDate: { $max: '$transactionDate' },
          totalCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]).toArray();

    console.log('=== OVERALL DATA RANGE ===');
    console.log(`Min Date: ${dateRange[0].minDate}`);
    console.log(`Max Date: ${dateRange[0].maxDate}`);
    console.log(`Total Transactions: ${dateRange[0].totalCount}`);
    console.log(`Total Revenue: $${dateRange[0].totalRevenue.toFixed(2)}`);

    // Simulate dashboard calculation (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('\n=== CURRENT PERIOD (Last 30 Days) ===');
    console.log(`Start: ${startDate.toISOString().split('T')[0]}`);
    console.log(`End: ${endDate.toISOString().split('T')[0]}`);

    const currentPeriod = await transactions.aggregate([
      {
        $match: {
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]).toArray();

    if (currentPeriod.length > 0) {
      console.log(`Transactions: ${currentPeriod[0].count}`);
      console.log(`Revenue: $${currentPeriod[0].revenue.toFixed(2)}`);
    } else {
      console.log('No transactions in current period');
    }

    // Calculate previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    console.log('\n=== PREVIOUS PERIOD (30 Days Before) ===');
    console.log(`Start: ${previousStartDate.toISOString().split('T')[0]}`);
    console.log(`End: ${previousEndDate.toISOString().split('T')[0]}`);

    const previousPeriod = await transactions.aggregate([
      {
        $match: {
          transactionDate: { $gte: previousStartDate, $lte: previousEndDate }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]).toArray();

    if (previousPeriod.length > 0) {
      console.log(`Transactions: ${previousPeriod[0].count}`);
      console.log(`Revenue: $${previousPeriod[0].revenue.toFixed(2)}`);

      // Calculate percentage change
      const revenueChange = ((currentPeriod[0].revenue - previousPeriod[0].revenue) / previousPeriod[0].revenue) * 100;
      const customerChange = ((currentPeriod[0].count - previousPeriod[0].count) / previousPeriod[0].count) * 100;

      console.log('\n=== COMPARISON ===');
      console.log(`Revenue Change: ${revenueChange.toFixed(1)}%`);
      console.log(`Customer Change: ${customerChange.toFixed(1)}%`);
    } else {
      console.log('⚠️ No transactions in previous period!');
      console.log('This explains the huge percentages (4912%)');
      console.log('The dashboard is comparing current data to zero.');
    }

    // Check distribution by month
    console.log('\n=== TRANSACTIONS BY MONTH ===');
    const byMonth = await transactions.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();

    byMonth.forEach(m => {
      const monthName = new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'long' });
      console.log(`${monthName} ${m._id.year}: ${m.count} transactions, $${m.revenue.toFixed(2)}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDateRanges();
