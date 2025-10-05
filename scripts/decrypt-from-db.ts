import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'm3n4o5p6q7r8_production_encryption_key';
  return Buffer.from(key, 'utf8').slice(0, 32);
}

function decryptField(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid encrypted data format - got ${parts.length} parts, expected 3`);
  }

  const [ivHex, authTagHex, encrypted] = parts;
  console.log('  IV length:', ivHex.length, 'chars');
  console.log('  AuthTag length:', authTagHex.length, 'chars');
  console.log('  Encrypted length:', encrypted.length, 'chars');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

async function main() {
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

    console.log('🔐 Raw Encrypted Values from Database:\n');
    console.log('clientId (encrypted):');
    console.log(restaurant.posConfig?.clientId);
    console.log('\nencryptedClientSecret:');
    console.log(restaurant.posConfig?.encryptedClientSecret);
    console.log('\nlocationId (plain):');
    console.log(restaurant.posConfig?.locationId);

    console.log('\n\n🔓 Attempting to decrypt clientId:');
    try {
      const decryptedClientId = decryptField(restaurant.posConfig?.clientId!);
      console.log('✅ Decrypted clientId:', decryptedClientId);
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
    }

    console.log('\n🔓 Attempting to decrypt encryptedClientSecret:');
    try {
      const decryptedSecret = decryptField(restaurant.posConfig?.encryptedClientSecret!);
      console.log('✅ Decrypted clientSecret:', decryptedSecret);
      console.log('   Length:', decryptedSecret.length);
      console.log('   First 50 chars:', decryptedSecret.substring(0, 50));
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
