"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToastCredentials = encryptToastCredentials;
exports.decryptToastCredentials = decryptToastCredentials;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Toast POS Credential Encryption Utilities
 * Uses AES-256-GCM for authenticated encryption
 */
const algorithm = 'aes-256-gcm';
/**
 * Get encryption key from environment
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY || 'm3n4o5p6q7r8';
    return Buffer.from(key, 'utf8').slice(0, 32);
}
/**
 * Encrypt a single field using AES-256-GCM
 */
function encryptField(text) {
    const key = getEncryptionKey();
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
/**
 * Decrypt a single field using AES-256-GCM
 */
function decryptField(encryptedData) {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Encrypt Toast credentials
 */
function encryptToastCredentials(credentials) {
    return {
        clientId: encryptField(credentials.clientId),
        clientSecret: encryptField(credentials.clientSecret),
        locationGuid: credentials.locationGuid // GUID doesn't need encryption (not sensitive)
    };
}
/**
 * Decrypt Toast credentials
 */
function decryptToastCredentials(encryptedData) {
    // Detailed error checking
    const missing = [];
    if (!encryptedData.clientId)
        missing.push('clientId');
    if (!encryptedData.encryptedClientSecret)
        missing.push('encryptedClientSecret');
    if (!encryptedData.locationId)
        missing.push('locationId');
    if (missing.length > 0) {
        throw new Error(`Missing required encrypted credentials: ${missing.join(', ')}. Available fields: ${Object.keys(encryptedData).join(', ')}`);
    }
    return {
        clientId: decryptField(encryptedData.clientId),
        clientSecret: decryptField(encryptedData.encryptedClientSecret),
        locationGuid: encryptedData.locationId
    };
}
