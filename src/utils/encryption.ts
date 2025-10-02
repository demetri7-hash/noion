import crypto from 'crypto';

/**
 * Encryption utility for sensitive data like API tokens
 * Uses AES-256-CBC for encryption (simplified for compatibility)
 */
export class EncryptionUtil {
  private static readonly algorithm = 'aes-256-cbc';
  private static readonly keyLength = 32;
  private static readonly ivLength = 16;

  /**
   * Generate a secure encryption key from a password
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Encrypt text using AES-256-CBC
   */
  static encrypt(text: string, password: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from password
      const key = this.deriveKey(password, salt);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, key);
      
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
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt text using AES-256-CBC
   */
  static decrypt(encryptedData: string, password: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.subarray(0, 16);
      const iv = combined.subarray(16, 16 + this.ivLength);
      const encrypted = combined.subarray(16 + this.ivLength);
      
      // Derive key from password
      const key = this.deriveKey(password, salt);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, key);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash a string using SHA-256
   */
  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate a secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate HMAC signature
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate a webhook secret
   */
  static generateWebhookSecret(): string {
    return this.generateSecureRandom(32);
  }

  /**
   * Encrypt API credentials object
   */
  static encryptCredentials(credentials: any, password: string): string {
    const credentialsString = JSON.stringify(credentials);
    return this.encrypt(credentialsString, password);
  }

  /**
   * Decrypt API credentials object
   */
  static decryptCredentials(encryptedCredentials: string, password: string): any {
    const credentialsString = this.decrypt(encryptedCredentials, password);
    return JSON.parse(credentialsString);
  }
}

/**
 * Environment-specific encryption helper
 */
export class SecureStorage {
  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return key;
  }

  /**
   * Encrypt data using environment encryption key
   */
  static encrypt(data: string): string {
    return EncryptionUtil.encrypt(data, this.getEncryptionKey());
  }

  /**
   * Decrypt data using environment encryption key
   */
  static decrypt(encryptedData: string): string {
    return EncryptionUtil.decrypt(encryptedData, this.getEncryptionKey());
  }

  /**
   * Store encrypted API token
   */
  static encryptApiToken(token: string): string {
    return this.encrypt(token);
  }

  /**
   * Retrieve and decrypt API token
   */
  static decryptApiToken(encryptedToken: string): string {
    return this.decrypt(encryptedToken);
  }

  /**
   * Store encrypted POS credentials
   */
  static encryptPOSCredentials(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    [key: string]: any;
  }): {
    encryptedClientSecret?: string;
    encryptedAccessToken?: string;
    encryptedRefreshToken?: string;
    clientId?: string;
  } {
    const result: any = {};
    
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
  static decryptPOSCredentials(encryptedCredentials: {
    encryptedClientSecret?: string;
    encryptedAccessToken?: string;
    encryptedRefreshToken?: string;
    clientId?: string;
  }): {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  } {
    const result: any = {};
    
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

export default EncryptionUtil;