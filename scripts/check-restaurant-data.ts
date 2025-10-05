/**
 * Check restaurant data and Toast connection status
 */
import mongoose from 'mongoose';
import { Restaurant, Transaction } from '../src/models';

async function checkData() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return;
    }

    console.log('Restaurant name:', restaurant.name);
    console.log('POS connected:', restaurant.posConfig?.isConnected);
    console.log('Has credentials:');
    console.log('  - clientId:', restaurant.posConfig?.clientId ? 'Yes' : 'No');
    console.log('  - encryptedSecret:', restaurant.posConfig?.encryptedClientSecret ? 'Yes' : 'No');
    console.log('  - locationId:', restaurant.posConfig?.locationId ? 'Yes' : 'No');
    console.log('\nTeam employees:', restaurant.team?.employees?.length || 0);

    const activeEmployees = restaurant.team?.employees?.filter((e: any) => e.isActive) || [];
    console.log('Active employees:', activeEmployees.length);

    if (activeEmployees.length > 0) {
      console.log('\nActive employees:');
      activeEmployees.slice(0, 5).forEach((e: any) => {
        console.log(`  - ${e.firstName} ${e.lastName} (${e.role})`);
      });
      if (activeEmployees.length > 5) {
        console.log(`  ... and ${activeEmployees.length - 5} more`);
      }
    }

    // Check transactions
    const txCount = await Transaction.countDocuments({ restaurantId: restaurant._id });
    console.log('\nTotal transactions:', txCount);

    if (txCount > 0) {
      const recentTx = await Transaction.findOne({ restaurantId: restaurant._id })
        .sort({ transactionDate: -1 })
        .lean();

      console.log('Most recent transaction:');
      console.log('  - Date:', recentTx?.transactionDate);
      console.log('  - Total:', recentTx?.total);
      console.log('  - Items:', recentTx?.items?.length);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
