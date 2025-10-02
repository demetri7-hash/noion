"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureStorage = exports.EncryptionUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Encryption utility for sensitive data like API tokens
 * Uses AES-256-CBC for encryption (simplified for compatibility)
 */
class EncryptionUtil {
    /**
     * Generate a secure encryption key from a password
     */
    static deriveKey(password, salt) {
        return crypto_1.default.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
    }
    /**
     * Encrypt text using AES-256-CBC
     */
    static encrypt(text, password) {
        try {
            // Generate random salt and IV
            const salt = crypto_1.default.randomBytes(16);
            const iv = crypto_1.default.randomBytes(this.ivLength);
            // Derive key from password
            const key = this.deriveKey(password, salt);
            // Create cipher with IV
            const cipher = crypto_1.default.createCipheriv(this.algorithm, key, iv);
            // Encrypt the text
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Combine salt, iv, and encrypted data
            const combined = Buffer.concat([
                salt,
                iv,
                Buffer.from(encrypted, 'hex')
            ]);
            return combined.toString('base64');
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    /**
     * Decrypt text using AES-256-CBC
     */
    static decrypt(encryptedData, password) {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64');
            // Extract components
            const salt = combined.subarray(0, 16);
            const iv = combined.subarray(16, 16 + this.ivLength);
            const encrypted = combined.subarray(16 + this.ivLength);
            // Derive key from password
            const key = this.deriveKey(password, salt);
            // Create decipher with IV
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, key, iv);
            // Decrypt the data
            let decrypted = decipher.update(encrypted, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    /**
     * Hash a string using SHA-256
     */
    static hash(text) {
        return crypto_1.default.createHash('sha256').update(text).digest('hex');
    }
    /**
     * Generate a secure random string
     */
    static generateSecureRandom(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    /**
     * Generate HMAC signature
     */
    static generateHMAC(data, secret) {
        return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
    }
    /**
     * Verify HMAC signature
     */
    static verifyHMAC(data, signature, secret) {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    /**
     * Generate a webhook secret
     */
    static generateWebhookSecret() {
        return this.generateSecureRandom(32);
    }
    /**
     * Encrypt API credentials object
     */
    static encryptCredentials(credentials, password) {
        const credentialsString = JSON.stringify(credentials);
        return this.encrypt(credentialsString, password);
    }
    /**
     * Decrypt API credentials object
     */
    static decryptCredentials(encryptedCredentials, password) {
        const credentialsString = this.decrypt(encryptedCredentials, password);
        return JSON.parse(credentialsString);
    }
}
exports.EncryptionUtil = EncryptionUtil;
EncryptionUtil.algorithm = 'aes-256-cbc';
EncryptionUtil.keyLength = 32;
EncryptionUtil.ivLength = 16;
/**
 * Environment-specific encryption helper
 */
class SecureStorage {
    static getEncryptionKey() {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        return key;
    }
    /**
     * Encrypt data using environment encryption key
     */
    static encrypt(data) {
        return EncryptionUtil.encrypt(data, this.getEncryptionKey());
    }
    /**
     * Decrypt data using environment encryption key
     */
    static decrypt(encryptedData) {
        return EncryptionUtil.decrypt(encryptedData, this.getEncryptionKey());
    }
    /**
     * Store encrypted API token
     */
    static encryptApiToken(token) {
        return this.encrypt(token);
    }
    /**
     * Retrieve and decrypt API token
     */
    static decryptApiToken(encryptedToken) {
        return this.decrypt(encryptedToken);
    }
    /**
     * Store encrypted POS credentials
     */
    static encryptPOSCredentials(credentials) {
        const result = {};
        // Don't encrypt client ID as it's not sensitive
        if (credentials.clientId) {
            result.clientId = credentials.clientId;
        }
        // Encrypt sensitive fields
        if (credentials.clientSecret) {
            result.encryptedClientSecret = this.encrypt(credentials.clientSecret);
        }
        if (credentials.accessToken) {
            result.encryptedAccessToken = this.encrypt(credentials.accessToken);
        }
        if (credentials.refreshToken) {
            result.encryptedRefreshToken = this.encrypt(credentials.refreshToken);
        }
        return result;
    }
    /**
     * Retrieve and decrypt POS credentials
     */
    static decryptPOSCredentials(encryptedCredentials) {
        const result = {};
        // Client ID is not encrypted
        if (encryptedCredentials.clientId) {
            result.clientId = encryptedCredentials.clientId;
        }
        // Decrypt sensitive fields
        if (encryptedCredentials.encryptedClientSecret) {
            result.clientSecret = this.decrypt(encryptedCredentials.encryptedClientSecret);
        }
        if (encryptedCredentials.encryptedAccessToken) {
            result.accessToken = this.decrypt(encryptedCredentials.encryptedAccessToken);
        }
        if (encryptedCredentials.encryptedRefreshToken) {
            result.refreshToken = this.decrypt(encryptedCredentials.encryptedRefreshToken);
        }
        return result;
    }
}
exports.SecureStorage = SecureStorage;
exports.default = EncryptionUtil;
