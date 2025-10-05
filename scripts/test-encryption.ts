import crypto from 'crypto';

// Test the toastEncryption format
const algorithm = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = 'm3n4o5p6q7r8_production_encryption_key';
  return Buffer.from(key, 'utf8').slice(0, 32);
}

function encryptField(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptField(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid encrypted data format - got ${parts.length} parts`);
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Test basic encryption/decryption
const original = 'dClMNN5GmpgCZYU8BtTK9NGCVT4eAmZtE0E4EkJO4CFpPJx2rXP26PTptwSe--Sa';
console.log('Original:', original);
console.log('Original length:', original.length);

const encrypted = encryptField(original);
console.log('\nEncrypted:', encrypted.substring(0, 100) + '...');
console.log('Encrypted length:', encrypted.length);
console.log('Format check:', encrypted.includes(':') ? 'HAS COLONS ✓' : 'NO COLONS ✗');

const decrypted = decryptField(encrypted);
console.log('\nDecrypted:', decrypted);
console.log('Match:', original === decrypted ? '✅ YES' : '❌ NO');
