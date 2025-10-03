/**
 * Compare Toast Sales Summary vs Database
 *
 * Analyzes discrepancies between official Toast data and what's in our database
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion?retryWrites=true&w=majority&appName=noion-cluster';

async function compareData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    const transactions = db.collection('transactions');

    // Toast data (from sales summary Sept 3 - Oct 2, 2025)
    const toastData = {
      netSales: 193821.79,
      tax: 16894.37,
      tips: 18783.12,
      total: 230474.02,
      orders: 5942,
      guests: 6280,
      avgPerOrder: 32.62,
      avgPerGuest: 30.86,
      peakHour: 18, // 6 PM
      peakHourRevenue: 25591.16,
      peakHourOrders: 745
    };

    // Database query for same period
    const startDate = new Date('2025-09-03T00:00:00.000Z');
    const endDate = new Date('2025-10-03T00:00:00.000Z');

    const dbTransactions = await transactions.find({
      transactionDate: { $gte: startDate, $lt: endDate }
    }).toArray();

    console.log('=== TOAST SALES SUMMARY (Official) ===');
    console.log(`Period: Sept 3 - Oct 2, 2025`);
    console.log(`Net Sales: $${toastData.netSales.toLocaleString()}`);
    console.log(`Tax: $${toastData.tax.toLocaleString()}`);
    console.log(`Tips: $${toastData.tips.toLocaleString()}`);
    console.log(`Total: $${toastData.total.toLocaleString()}`);
    console.log(`Orders: ${toastData.orders.toLocaleString()}`);
    console.log(`Guests: ${toastData.guests.toLocaleString()}`);
    console.log(`Avg/Order: $${toastData.avgPerOrder}`);
    console.log(`Peak Hour: ${toastData.peakHour}:00 (6 PM)`);
    console.log(`Peak Hour Revenue: $${toastData.peakHourRevenue.toLocaleString()}`);

    console.log('\n=== DATABASE (What We Imported) ===');
    console.log(`Transactions Found: ${dbTransactions.length.toLocaleString()}`);

    let totalAmount = 0;
    let totalTax = 0;
    let totalTips = 0;
    let totalNetAmount = 0;

    dbTransactions.forEach(t => {
      totalAmount += t.totalAmount || 0;
      totalTax += t.totals?.tax || 0;
      totalTips += t.totals?.tip || 0;
      totalNetAmount += t.totals?.netAmount || 0;
    });

    console.log(`Sum of totalAmount: $${totalAmount.toLocaleString()}`);
    console.log(`Sum of totals.tax: $${totalTax.toLocaleString()}`);
    console.log(`Sum of totals.tip: $${totalTips.toLocaleString()}`);
    console.log(`Sum of totals.netAmount: $${totalNetAmount.toLocaleString()}`);

    const avgPerTransaction = dbTransactions.length > 0 ? totalAmount / dbTransactions.length : 0;
    console.log(`Avg/Transaction: $${avgPerTransaction.toFixed(2)}`);

    // Peak hours from database
    const hourlyData = {};
    dbTransactions.forEach(t => {
      if (t.analytics?.hourOfDay !== undefined) {
        const hour = t.analytics.hourOfDay;
        if (!hourlyData[hour]) {
          hourlyData[hour] = { count: 0, revenue: 0 };
        }
        hourlyData[hour].count++;
        hourlyData[hour].revenue += t.totalAmount || 0;
      }
    });

    const topHour = Object.entries(hourlyData)
      .sort((a, b) => b[1].revenue - a[1].revenue)[0];

    if (topHour) {
      console.log(`Peak Hour (UTC): ${topHour[0]}:00`);
      console.log(`Peak Hour Revenue: $${topHour[1].revenue.toLocaleString()}`);
      console.log(`Peak Hour Orders: ${topHour[1].count}`);
    }

    console.log('\n=== DISCREPANCIES ===');
    const ordersDiff = dbTransactions.length - toastData.orders;
    const revenueDiff = totalAmount - toastData.total;

    console.log(`Orders: ${ordersDiff > 0 ? '+' : ''}${ordersDiff} (${((ordersDiff / toastData.orders) * 100).toFixed(1)}%)`);
    console.log(`Revenue: ${revenueDiff > 0 ? '+' : ''}$${Math.abs(revenueDiff).toLocaleString()} (${((revenueDiff / toastData.total) * 100).toFixed(1)}%)`);

    // Check specific fields
    console.log('\n=== FIELD ANALYSIS ===');
    const sampleTx = dbTransactions[0];
    console.log('Sample transaction structure:');
    console.log(`  totalAmount: $${sampleTx.totalAmount}`);
    console.log(`  totals.netAmount: $${sampleTx.totals?.netAmount || 0}`);
    console.log(`  totals.tax: $${sampleTx.totals?.tax || 0}`);
    console.log(`  totals.tip: $${sampleTx.totals?.tip || 0}`);
    console.log(`  totals.gross: $${sampleTx.totals?.gross || 0}`);

    // Analysis
    console.log('\n=== ANALYSIS ===');

    if (Math.abs(totalAmount - toastData.total) < 10000) {
      console.log('✅ Database totalAmount is close to Toast Total');
      console.log(`   Likely using: Net Sales + Tax + Tips`);
    } else if (Math.abs(totalAmount - toastData.netSales) < 1000) {
      console.log('✅ Database totalAmount matches Toast Net Sales');
    } else {
      console.log('⚠️ Database totalAmount does not match any Toast field');
      console.log(`   Toast Total: $${toastData.total.toLocaleString()}`);
      console.log(`   Toast Net: $${toastData.netSales.toLocaleString()}`);
      console.log(`   Database: $${totalAmount.toLocaleString()}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Comparison complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compareData();
