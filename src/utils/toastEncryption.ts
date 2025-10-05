import crypto from 'crypto';

/**
 * Toast POS Credential Encryption Utilities
 * Uses AES-256-GCM for authenticated encryption
 */

const algorithm = 'aes-256-gcm';

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'm3n4o5p6q7r8';
  return Buffer.from(key, 'utf8').slice(0, 32);
}

/**
 * Encrypt a single field using AES-256-GCM
 */
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

/**
 * Decrypt a single field using AES-256-GCM
 */
function decryptField(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
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

/**
 * Encrypt Toast credentials
 */
export function encryptToastCredentials(credentials: {
  clientId: string;
  clientSecret: string;
  locationGuid: string;
}) {
  return {
    clientId: encryptField(credentials.clientId),
    clientSecret: encryptField(credentials.clientSecret),
    locationGuid: credentials.locationGuid // GUID doesn't need encryption (not sensitive)
  };
}

/**
 * Decrypt Toast credentials
 */
export function decryptToastCredentials(encryptedData: {
  clientId?: string;
  encryptedClientSecret?: string;
  locationId?: string;
}): {
  clientId: string;
  clientSecret: string;
  locationGuid: string;
} {
  // Detailed error checking
  const missing: string[] = [];
  if (!encryptedData.clientId) missing.push('clientId');
  if (!encryptedData.encryptedClientSecret) missing.push('encryptedClientSecret');
  if (!encryptedData.locationId) missing.push('locationId');

  if (missing.length > 0) {
    throw new Error(`Missing required encrypted credentials: ${missing.join(', ')}. Available fields: ${Object.keys(encryptedData).join(', ')}`);
  }

  return {
    clientId: decryptField(encryptedData.clientId!),
    clientSecret: decryptField(encryptedData.encryptedClientSecret!),
    locationGuid: encryptedData.locationId!
  };
}
