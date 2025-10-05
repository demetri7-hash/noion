/**
 * Diagnostic script to check Toast credentials in database
 * Usage: npx tsx scripts/check-toast-credentials.ts <restaurantId>
 */

import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';

async function checkCredentials() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Error: Please provide a restaurant ID');
    console.log('Usage: npx tsx scripts/check-toast-credentials.ts <restaurantId>');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB');

    // Find restaurant
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.error(`❌ Restaurant not found: ${restaurantId}`);
      process.exit(1);
    }

    console.log('\n📊 Restaurant Info:');
    console.log('   Name:', restaurant.name);
    console.log('   Owner:', restaurant.owner.email);

    console.log('\n🔍 POS Configuration:');
    console.log('   Type:', restaurant.posConfig?.type);
    console.log('   Is Connected:', restaurant.posConfig?.isConnected);
    console.log('   Is Active:', restaurant.posConfig?.isActive);
    console.log('   Sync Interval:', restaurant.posConfig?.syncInterval);
    console.log('   Last Sync:', restaurant.posConfig?.lastSyncAt?.toISOString() || 'Never');

    console.log('\n🔐 Credentials Status:');
    console.log('   Has clientId:', !!restaurant.posConfig?.clientId);
    console.log('   Has encryptedClientSecret:', !!restaurant.posConfig?.encryptedClientSecret);
    console.log('   Has locationId:', !!restaurant.posConfig?.locationId);

    if (restaurant.posConfig?.clientId) {
      console.log('\n   clientId (encrypted):');
      console.log('     - Length:', restaurant.posConfig.clientId.length);
      console.log('     - Format:', restaurant.posConfig.clientId.includes(':') ? 'Valid (iv:authTag:encrypted)' : 'Invalid');
      console.log('     - Preview:', restaurant.posConfig.clientId.substring(0, 50) + '...');
    }

    if (restaurant.posConfig?.encryptedClientSecret) {
      console.log('\n   encryptedClientSecret:');
      console.log('     - Length:', restaurant.posConfig.encryptedClientSecret.length);
      console.log('     - Format:', restaurant.posConfig.encryptedClientSecret.includes(':') ? 'Valid (iv:authTag:encrypted)' : 'Invalid');
      console.log('     - Preview:', restaurant.posConfig.encryptedClientSecret.substring(0, 50) + '...');
    }

    if (restaurant.posConfig?.locationId) {
      console.log('\n   locationId (plain GUID):');
      console.log('     - Value:', restaurant.posConfig.locationId);
      console.log('     - Format:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurant.posConfig.locationId) ? 'Valid GUID' : 'Invalid GUID');
    }

    console.log('\n✅ Diagnostic complete');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkCredentials();
