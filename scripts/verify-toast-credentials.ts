/**
 * Verify Toast credentials can be decrypted and are valid
 * Usage: npx tsx scripts/verify-toast-credentials.ts <restaurantId>
 */

import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';
import { decryptToastCredentials } from '../src/utils/toastEncryption';
import axios from 'axios';

async function verifyCredentials() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    // Connect to MongoDB
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Find restaurant
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.error(`❌ Restaurant not found: ${restaurantId}`);
      process.exit(1);
    }

    console.log('📊 Restaurant:', restaurant.name);
    console.log('\n🔐 Encrypted Credentials in Database:');
    console.log('   clientId (encrypted):', restaurant.posConfig?.clientId?.substring(0, 50) + '...');
    console.log('   encryptedClientSecret:', restaurant.posConfig?.encryptedClientSecret?.substring(0, 50) + '...');
    console.log('   locationId (plain):', restaurant.posConfig?.locationId);

    // Try to decrypt
    console.log('\n🔓 Attempting to decrypt...');
    try {
      const credentials = decryptToastCredentials({
        clientId: restaurant.posConfig?.clientId,
        encryptedClientSecret: restaurant.posConfig?.encryptedClientSecret,
        locationId: restaurant.posConfig?.locationId
      });

      console.log('✅ Decryption successful!\n');
      console.log('📝 Decrypted Credentials:');
      console.log('   clientId:', credentials.clientId);
      console.log('   clientSecret:', credentials.clientSecret.substring(0, 20) + '...');
      console.log('   locationGuid:', credentials.locationGuid);

      // Try to authenticate with Toast
      console.log('\n🔑 Testing authentication with Toast API...');
      try {
        const authResponse = await axios.post(
          'https://ws-api.toasttab.com/authentication/v1/authentication/login',
          {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            userAccessType: 'TOAST_MACHINE_CLIENT'
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (authResponse.data.token?.accessToken) {
          console.log('✅ Authentication SUCCESSFUL!');
          console.log('   Access Token received:', authResponse.data.token.accessToken.substring(0, 30) + '...');
          console.log('   Token Type:', authResponse.data.token.tokenType);
          console.log('   Expires In:', authResponse.data.token.expiresIn, 'seconds');

          if (authResponse.data.managementGroups?.length > 0) {
            console.log('\n   Management Groups:');
            authResponse.data.managementGroups.forEach((group: any) => {
              console.log(`     - ${group.name} (${group.guid})`);
            });
          }

          // Test fetching restaurant info
          console.log('\n🏪 Testing restaurant info fetch...');
          try {
            const restaurantInfo = await axios.get(
              `https://ws-api.toasttab.com/restaurants/v1/restaurants/${credentials.locationGuid}`,
              {
                headers: {
                  'Authorization': `Bearer ${authResponse.data.token.accessToken}`,
                  'Toast-Restaurant-External-ID': credentials.locationGuid
                }
              }
            );
            console.log('✅ Restaurant info fetched successfully!');
            console.log('   Restaurant Name:', restaurantInfo.data.name || 'N/A');
            console.log('   Restaurant GUID:', restaurantInfo.data.guid);
          } catch (error: any) {
            console.log('⚠️  Could not fetch restaurant info:', error.response?.status, error.response?.statusText);
          }

        } else {
          console.log('❌ No access token in response');
        }

      } catch (error: any) {
        console.log('❌ Authentication FAILED!');
        console.log('   Status:', error.response?.status);
        console.log('   Status Text:', error.response?.statusText);
        console.log('   Error Data:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.status === 401) {
          console.log('\n💡 This means the credentials are INVALID or EXPIRED.');
          console.log('   Please check:');
          console.log('   1. Client ID is correct');
          console.log('   2. Client Secret is correct');
          console.log('   3. Credentials are active in Toast developer portal');
        }
      }

    } catch (error: any) {
      console.log('❌ Decryption failed:', error.message);
      console.log('\n💡 This usually means:');
      console.log('   1. ENCRYPTION_KEY mismatch between environments');
      console.log('   2. Corrupted data in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyCredentials();
