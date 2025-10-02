#!/usr/bin/env node

/**
 * Generate secure random secrets for .env file
 * Run: node generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 NOION Analytics - Secret Generator\n');
console.log('Copy these values to your .env.local file:\n');
console.log('─'.repeat(60));

// JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log(`JWT_SECRET=${jwtSecret}`);

// JWT Refresh Secret
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);

// Encryption Key (32 bytes for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

console.log('─'.repeat(60));
console.log('\n✅ Secrets generated successfully!\n');
console.log('Next steps:');
console.log('1. Copy the values above to your .env.local file');
console.log('2. Add your MongoDB Atlas connection string');
console.log('3. Add your Anthropic API key');
console.log('4. Add your Toast API credentials');
console.log('\n');
