/**
 * Clear corrupted Toast credentials from database
 * Usage: npx tsx scripts/clear-toast-credentials.ts <restaurantId>
 */

import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';

async function clearCredentials() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.error(`❌ Restaurant not found: ${restaurantId}`);
      process.exit(1);
    }

    console.log('📊 Current POS Config:');
    console.log('   Type:', restaurant.posConfig?.type);
    console.log('   Is Connected:', restaurant.posConfig?.isConnected);
    console.log('   Has clientId:', !!restaurant.posConfig?.clientId);
    console.log('   Has encryptedClientSecret:', !!restaurant.posConfig?.encryptedClientSecret);
    console.log('   Has locationId:', !!restaurant.posConfig?.locationId);

    console.log('\n🗑️  Clearing Toast credentials...');

    // Clear POS config
    restaurant.posConfig = {
      type: 'other' as any,
      isConnected: false,
      isActive: false
    };

    await restaurant.save();

    console.log('✅ Toast credentials cleared successfully!');
    console.log('\nYou can now reconnect Toast POS with fresh credentials.');
    console.log('Go to: https://noion-zeta.vercel.app/pos');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

clearCredentials();
