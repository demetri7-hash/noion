/**
 * Verify Revenue Accuracy
 *
 * Checks if dashboard metrics match actual database totals
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function verifyRevenue() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Simulate dashboard query (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('=== DASHBOARD QUERY (Last 30 Days) ===');
    console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

    // Get transactions for current period
    const currentTransactions = await transactions.find({
      transactionDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'voided' }
    }).toArray();

    console.log(`Total Transactions Found: ${currentTransactions.length}`);

    // Calculate revenue manually
    let totalRevenue = 0;
    let totalAmountSum = 0;
    let netAmountSum = 0;
    let validTransactions = 0;

    currentTransactions.forEach(t => {
      if (t.totalAmount) {
        totalAmountSum += t.totalAmount;
        validTransactions++;
      }
      if (t.totals?.netAmount) {
        netAmountSum += t.totals.netAmount;
      }
    });

    console.log('\n=== REVENUE CALCULATION ===');
    console.log(`Transactions with totalAmount: ${validTransactions}`);
    console.log(`Sum of totalAmount: $${totalAmountSum.toFixed(2)}`);
    console.log(`Sum of totals.netAmount: $${netAmountSum.toFixed(2)}`);

    // The dashboard uses totalAmount
    console.log('\n=== EXPECTED DASHBOARD VALUES ===');
    console.log(`Total Revenue: $${totalAmountSum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    console.log(`Customers Served: ${currentTransactions.length.toLocaleString()}`);
    console.log(`Average Ticket: $${validTransactions > 0 ? (totalAmountSum / validTransactions).toFixed(0) : 0}`);

    // Sample a few transactions to verify data quality
    console.log('\n=== SAMPLE TRANSACTIONS ===');
    const sample = currentTransactions.slice(0, 3);
    sample.forEach((t, i) => {
      console.log(`\nTransaction ${i + 1}:`);
      console.log(`  Date: ${t.transactionDate}`);
      console.log(`  Total Amount: $${t.totalAmount}`);
      console.log(`  Status: ${t.status || 'N/A'}`);
      console.log(`  Items: ${t.items?.length || 0}`);
    });

    // Check for any anomalies
    console.log('\n=== DATA QUALITY CHECKS ===');

    const zeroAmount = currentTransactions.filter(t => !t.totalAmount || t.totalAmount === 0);
    console.log(`Transactions with $0 amount: ${zeroAmount.length}`);

    const negativeAmount = currentTransactions.filter(t => t.totalAmount < 0);
    console.log(`Transactions with negative amount: ${negativeAmount.length}`);

    const veryHighAmount = currentTransactions.filter(t => t.totalAmount > 1000);
    console.log(`Transactions over $1,000: ${veryHighAmount.length}`);
    if (veryHighAmount.length > 0) {
      console.log('  Sample high transaction:', veryHighAmount[0].totalAmount);
    }

    // Verify peak hours calculation
    console.log('\n=== PEAK HOURS VERIFICATION ===');
    const hourlyData = {};
    currentTransactions.forEach(t => {
      if (t.analytics?.hourOfDay !== undefined) {
        const hour = t.analytics.hourOfDay;
        if (!hourlyData[hour]) {
          hourlyData[hour] = { count: 0, revenue: 0 };
        }
        hourlyData[hour].count++;
        hourlyData[hour].revenue += t.totalAmount || 0;
      }
    });

    const sortedHours = Object.entries(hourlyData)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    console.log('Top 5 hours by revenue:');
    sortedHours.forEach(([hour, data], i) => {
      const h = parseInt(hour);
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      console.log(`  ${i + 1}. ${displayHour}:00 ${period} (${h}:00 UTC) - ${data.count} orders, $${data.revenue.toFixed(2)}`);
    });

    const peakHour = parseInt(sortedHours[0][0]);
    const peakHourNext = (peakHour + 1) % 24;
    const formatHour = (h) => {
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      return `${displayHour}:00 ${period}`;
    };

    console.log(`\nExpected Peak Hours Display: ${formatHour(peakHour)} - ${formatHour(peakHourNext + 1)}`);
    console.log(`Expected Peak Revenue: $${sortedHours[0][1].revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

    await mongoose.connection.close();
    console.log('\n✅ Verification complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyRevenue();
