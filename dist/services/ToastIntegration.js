"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastIntegration = exports.toastIntegration = exports.ToastIntegrationService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const Transaction_1 = require("../models/Transaction");
// Toast API configuration
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
const TOAST_AUTH_URL = 'https://ws-api.toasttab.com/authentication/v1/authentication/login';
const RATE_LIMIT_PER_HOUR = 1000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
// Rate limiting class
class RateLimiter {
    constructor(maxRequests = RATE_LIMIT_PER_HOUR, timeWindow = 3600000) {
        this.requests = [];
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow; // 1 hour in milliseconds
    }
    async checkLimit() {
        const now = Date.now();
        // Remove requests older than time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        this.requests.push(now);
        return true;
    }
    getTimeUntilReset() {
        if (this.requests.length === 0)
            return 0;
        const oldestRequest = Math.min(...this.requests);
        const timeUntilReset = this.timeWindow - (Date.now() - oldestRequest);
        return Math.max(0, timeUntilReset);
    }
}
// Encryption utility for storing sensitive data
class EncryptionUtil {
    static encrypt(text, password) {
        // Generate key from password
        const key = crypto_1.default.createHash('sha256').update(password).digest();
        // Generate random IV
        const iv = crypto_1.default.randomBytes(this.ivLength);
        // Create cipher with IV
        const cipher = crypto_1.default.createCipheriv(this.algorithm, key, iv);
        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Get auth tag (required for GCM mode)
        const authTag = cipher.getAuthTag();
        // Combine IV, auth tag, and encrypted data
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);
        return combined.toString('base64');
    }
    static decrypt(encryptedData, password) {
        // Generate key from password
        const key = crypto_1.default.createHash('sha256').update(password).digest();
        // Decode from base64
        const combined = Buffer.from(encryptedData, 'base64');
        // Extract components
        const iv = combined.subarray(0, this.ivLength);
        const authTag = combined.subarray(this.ivLength, this.ivLength + 16);
        const encrypted = combined.subarray(this.ivLength + 16);
        // Create decipher with IV
        const decipher = crypto_1.default.createDecipheriv(this.algorithm, key, iv);
        // Set auth tag (required for GCM mode)
        decipher.setAuthTag(authTag);
        // Decrypt the data
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
EncryptionUtil.algorithm = 'aes-256-gcm';
EncryptionUtil.keyLength = 32;
EncryptionUtil.ivLength = 12; // GCM mode uses 12-byte IV
// Main Toast Integration Service
class ToastIntegrationService {
    constructor() {
        this.rateLimiter = new RateLimiter();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
        this.client = axios_1.default.create({
            baseURL: TOAST_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NOION-Analytics/1.0'
            }
        });
        // Add request interceptor for rate limiting
        this.client.interceptors.request.use(async (config) => {
            const canProceed = await this.rateLimiter.checkLimit();
            if (!canProceed) {
                const waitTime = this.rateLimiter.getTimeUntilReset();
                throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 60000)} minutes.`);
            }
            return config;
        });
        // Add response interceptor for retry logic
        this.client.interceptors.response.use((response) => response, async (error) => {
            const config = error.config;
            if (!config._retryCount) {
                config._retryCount = 0;
            }
            if (config._retryCount < RETRY_ATTEMPTS && this.shouldRetry(error)) {
                config._retryCount++;
                await this.delay(RETRY_DELAY_MS * config._retryCount);
                return this.client(config);
            }
            return Promise.reject(error);
        });
    }
    shouldRetry(error) {
        return (error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            (error.response && error.response.status >= 500) ||
            (error.response && error.response.status === 429) // Rate limit
        );
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * NOTE: Toast does NOT use traditional OAuth 2.0 authorization code flow
     * There is no /oauth/authorize endpoint or redirect-based user authorization
     *
     * Instead, Toast uses:
     * 1. Partner Program: Restaurants enable integrations in Toast Web (1-click)
     * 2. Webhooks: You receive notifications when restaurants connect
     * 3. Manual GUID Entry: For testing/custom integrations (temporary solution)
     *
     * This method has been removed as it generated a fake OAuth URL
     */
    /**
     * Initiate OAuth 2.0 authentication with Toast
     */
    async authenticateRestaurant(credentials) {
        try {
            const response = await this.client.post('/authentication/v1/authentication/login', {
                clientId: credentials.clientId,
                clientSecret: credentials.clientSecret,
                userAccessType: 'TOAST_MACHINE_CLIENT'
            });
            if (!response.data.token) {
                throw new Error('Authentication failed: No token received');
            }
            return response.data;
        }
        catch (error) {
            console.error('Toast authentication failed:', error);
            throw new Error(`Toast authentication failed: ${error.message}`);
        }
    }
    /**
     * Connect a restaurant to Toast POS system
     */
    async connectRestaurant(restaurantId, credentials) {
        try {
            // Authenticate with Toast
            const authResponse = await this.authenticateRestaurant(credentials);
            // Find the restaurant in our database
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            // Update restaurant connection status
            // DON'T overwrite posConfig - it already has encrypted credentials from connect route
            // Just update the connection status and sync time
            restaurant.posConfig.isConnected = true;
            restaurant.posConfig.lastSyncAt = new Date();
            if (authResponse.managementGroups?.[0]?.guid) {
                restaurant.posConfig.managementGroupId = authResponse.managementGroups[0].guid;
            }
            await restaurant.save();
            // Perform initial data sync and get imported count
            const ordersImported = await this.performInitialSync(restaurant._id, authResponse.token.accessToken);
            return { success: true, ordersImported };
        }
        catch (error) {
            console.error('Failed to connect restaurant to Toast:', error);
            throw error;
        }
    }
    /**
     * Disconnect restaurant from Toast POS
     */
    async disconnectRestaurant(restaurantId) {
        try {
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            // Disconnect POS configuration
            restaurant.posConfig.isConnected = false;
            restaurant.posConfig.encryptedAccessToken = undefined;
            restaurant.posConfig.encryptedRefreshToken = undefined;
            restaurant.posConfig.lastSyncAt = undefined;
            await restaurant.save();
            return true;
        }
        catch (error) {
            console.error('Failed to disconnect restaurant from Toast:', error);
            throw error;
        }
    }
    /**
     * Fetch transactions from Toast API
     * Note: Using /ordersBulk endpoint which supports up to 30-day date ranges
     */
    async fetchTransactions(restaurantId, startDate, endDate) {
        try {
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            // Re-authenticate to get fresh access token
            // (Access tokens expire, so we always authenticate fresh using stored credentials)
            const { decryptToastCredentials } = await Promise.resolve().then(() => __importStar(require('../utils/toastEncryption')));
            const credentials = decryptToastCredentials({
                clientId: restaurant.posConfig.clientId,
                encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
                locationId: restaurant.posConfig.locationId
            });
            const authResponse = await this.authenticateRestaurant(credentials);
            const accessToken = authResponse.token.accessToken;
            // Use /ordersBulk endpoint which supports up to 30-day ranges
            // Break into 30-day chunks if the date range is longer
            const allTransactions = [];
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
            let currentStart = new Date(startDate.getTime());
            const finalEnd = new Date(endDate.getTime());
            console.log(`Fetching Toast transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);
            let chunkCount = 0;
            while (currentStart < finalEnd) {
                // Calculate end of this chunk (max 30 days)
                const currentEnd = new Date(Math.min(currentStart.getTime() + thirtyDaysMs, finalEnd.getTime()));
                chunkCount++;
                console.log(`Fetching chunk ${chunkCount}: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);
                try {
                    // Paginate through all pages for this date range using page numbers
                    // Note: /ordersBulk uses 'page' parameter, not 'pageToken'
                    let hasMorePages = true;
                    let chunkTotal = 0;
                    let page = 1;
                    while (hasMorePages) {
                        const response = await this.client.get(`/orders/v2/ordersBulk`, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
                            },
                            params: {
                                startDate: currentStart.toISOString(),
                                endDate: currentEnd.toISOString(),
                                pageSize: 100,
                                page: page
                            }
                        });
                        const pageData = response.data || [];
                        allTransactions.push(...pageData);
                        chunkTotal += pageData.length;
                        console.log(`  ✓ Chunk ${chunkCount}, Page ${page}: Retrieved ${pageData.length} orders (total: ${chunkTotal})`);
                        // If we got a full page (100 orders), there might be more
                        // Continue until we get less than pageSize
                        if (pageData.length === 100) {
                            page++;
                            // Small delay between pages (rate limit: 5 req/second)
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                        else {
                            hasMorePages = false;
                        }
                    }
                }
                catch (error) {
                    console.error(`  ✗ Chunk ${chunkCount} failed:`, error);
                    // Continue with other chunks even if one fails
                }
                // Move to next chunk
                currentStart = new Date(currentEnd.getTime());
                // Add delay to respect rate limits (5-10 seconds recommended between calls)
                if (currentStart < finalEnd) {
                    console.log('  Waiting 5 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            console.log(`✅ Total transactions fetched: ${allTransactions.length} from ${chunkCount} chunks`);
            return allTransactions;
        }
        catch (error) {
            console.error('Failed to fetch transactions from Toast:', error);
            throw error;
        }
    }
    /**
     * Normalize Toast transaction data to our schema
     */
    normalizeTransaction(toastTransaction, restaurantId) {
        try {
            const check = toastTransaction.checks[0]; // Get primary check
            if (!check) {
                throw new Error('No check data found in transaction');
            }
            // Calculate items
            const items = check.selections.map(selection => ({
                id: selection.guid,
                name: selection.item?.entityType || 'Unknown Item',
                category: 'General', // Toast doesn't always provide category
                quantity: selection.quantity,
                unitPrice: selection.price / selection.quantity,
                totalPrice: selection.price,
                modifiers: selection.modifiers?.map(mod => ({
                    id: mod.guid,
                    name: mod.modifier?.entityType || 'Unknown Modifier',
                    price: 0 // Toast doesn't always provide modifier price
                })) || [],
                discounts: selection.appliedDiscounts?.map(discount => ({
                    id: discount.guid,
                    name: discount.discount?.entityType || 'Unknown Discount',
                    type: 'fixed',
                    value: discount.discountAmount,
                    amount: discount.discountAmount
                })) || []
            }));
            // Calculate payments
            const payments = check.payments.map(payment => {
                let tipPercentage = 0;
                // Calculate tip percentage safely
                if (payment.tipAmount > 0) {
                    const preTipAmount = payment.amount - payment.tipAmount;
                    // Only calculate percentage if pre-tip amount is positive
                    if (preTipAmount > 0) {
                        tipPercentage = Math.min((payment.tipAmount / preTipAmount) * 100, 100);
                    }
                    // If pre-tip amount is 0 or negative (refunds/voids), set to 0
                    else {
                        tipPercentage = 0;
                    }
                }
                return {
                    method: this.mapToastPaymentMethod(payment.paymentType),
                    amount: payment.amount,
                    cardType: payment.lastFour ? 'other' : undefined,
                    last4Digits: payment.lastFour,
                    tip: payment.tipAmount > 0 ? {
                        amount: payment.tipAmount,
                        percentage: tipPercentage,
                        method: 'card'
                    } : undefined
                };
            });
            // Map order type
            const orderType = this.mapToastOrderType(toastTransaction.diningOption?.behavior);
            // Map transaction status
            const status = check.voided ? Transaction_1.TransactionStatus.VOIDED :
                check.paymentStatus === 'PAID' ? Transaction_1.TransactionStatus.COMPLETED :
                    Transaction_1.TransactionStatus.PENDING;
            return {
                restaurantId: restaurantId,
                posTransactionId: toastTransaction.guid,
                posSystemType: 'toast',
                orderType,
                status,
                items,
                subtotal: check.totalAmount - check.taxAmount,
                tax: check.taxAmount,
                tip: check.payments.reduce((sum, p) => sum + p.tipAmount, 0),
                totalAmount: check.totalAmount,
                payments,
                employee: {
                    id: toastTransaction.server?.guid || 'unassigned',
                    name: toastTransaction.server?.guid ? undefined : (toastTransaction.source || 'System'),
                    role: toastTransaction.server ? 'server' : 'system'
                },
                timing: {
                    orderStartedAt: new Date(toastTransaction.openedDate),
                    orderCompletedAt: toastTransaction.closedDate ? new Date(toastTransaction.closedDate) : undefined,
                    paymentProcessedAt: check.payments[0]?.paidDate ? new Date(check.payments[0].paidDate) : undefined
                },
                location: {
                    id: toastTransaction.restaurantId,
                    tableNumber: toastTransaction.table?.entityType
                },
                analytics: {
                    isUpsellOpportunity: false, // Will be calculated later
                    orderAccuracy: !check.voided,
                    serviceEfficiency: 'average',
                    revenueCategory: 'medium', // Will be calculated in pre-save
                    isRepeatCustomer: false, // Will be determined by customer analysis
                    isDuringPeakHours: false, // Will be calculated in pre-save
                    dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(toastTransaction.openedDate).getDay()],
                    hourOfDay: new Date(toastTransaction.openedDate).getUTCHours(),
                    anomalies: []
                },
                integration: {
                    lastSyncedAt: new Date(),
                    syncVersion: 1,
                    webhookReceived: false,
                    rawPOSData: toastTransaction
                },
                transactionDate: new Date(toastTransaction.openedDate) // Use openedDate instead of businessDate
            };
        }
        catch (error) {
            console.error('Failed to normalize Toast transaction:', error);
            throw error;
        }
    }
    mapToastPaymentMethod(toastPaymentType) {
        switch (toastPaymentType?.toLowerCase()) {
            case 'cash':
                return Transaction_1.PaymentMethod.CASH;
            case 'credit':
            case 'credit_card':
                return Transaction_1.PaymentMethod.CREDIT_CARD;
            case 'debit':
            case 'debit_card':
                return Transaction_1.PaymentMethod.DEBIT_CARD;
            case 'gift_card':
                return Transaction_1.PaymentMethod.GIFT_CARD;
            case 'loyalty':
                return Transaction_1.PaymentMethod.LOYALTY_POINTS;
            default:
                return Transaction_1.PaymentMethod.OTHER;
        }
    }
    mapToastOrderType(diningBehavior) {
        switch (diningBehavior?.toLowerCase()) {
            case 'dine_in':
            case 'eat_in':
                return Transaction_1.OrderType.DINE_IN;
            case 'takeout':
            case 'take_out':
                return Transaction_1.OrderType.TAKEOUT;
            case 'delivery':
                return Transaction_1.OrderType.DELIVERY;
            case 'drive_thru':
            case 'drive_through':
                return Transaction_1.OrderType.DRIVE_THROUGH;
            case 'curbside':
                return Transaction_1.OrderType.CURBSIDE;
            default:
                return Transaction_1.OrderType.DINE_IN;
        }
    }
    /**
     * Perform initial sync of historical data
     * Returns the number of transactions imported
     */
    async performInitialSync(restaurantId, accessToken) {
        try {
            console.log(`Starting initial sync for restaurant ${restaurantId}`);
            // Fetch last 30 days of data using /ordersBulk endpoint
            // /ordersBulk supports up to 30-day date ranges (only 1 API call needed)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const toastTransactions = await this.fetchTransactions(restaurantId, startDate, endDate);
            console.log(`Fetched ${toastTransactions.length} transactions from Toast`);
            // Import transactions
            const importedCount = await this.importTransactions(restaurantId, toastTransactions);
            console.log(`Initial sync completed for restaurant ${restaurantId}`);
            return importedCount;
        }
        catch (error) {
            console.error('Initial sync failed:', error);
            throw error;
        }
    }
    /**
     * Import transactions into our database
     * Returns the number of transactions successfully imported
     */
    async importTransactions(restaurantId, toastTransactions) {
        const { Transaction } = await Promise.resolve().then(() => __importStar(require('../models')));
        let importedCount = 0;
        for (const toastTransaction of toastTransactions) {
            try {
                // Check if transaction already exists
                const existingTransaction = await Transaction.findOne({
                    restaurantId: restaurantId,
                    posTransactionId: toastTransaction.guid
                });
                if (existingTransaction) {
                    continue; // Skip if already imported
                }
                // Normalize and save transaction
                const normalizedData = this.normalizeTransaction(toastTransaction, restaurantId);
                const transaction = new Transaction(normalizedData);
                await transaction.save();
                importedCount++;
            }
            catch (error) {
                console.error(`Failed to import transaction ${toastTransaction.guid}:`, error);
                // Continue with next transaction
            }
        }
        console.log(`Imported ${importedCount} new transactions (${toastTransactions.length - importedCount} duplicates skipped)`);
        return importedCount;
    }
    /**
     * Handle webhook from Toast
     */
    async handleWebhook(payload, signature, restaurantId) {
        try {
            // Verify webhook signature
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant?.posConfig.webhookSecret) {
                throw new Error('Webhook secret not configured');
            }
            const expectedSignature = crypto_1.default
                .createHmac('sha256', restaurant.posConfig.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');
            if (signature !== expectedSignature) {
                throw new Error('Invalid webhook signature');
            }
            // Process webhook payload
            if (payload.eventType === 'ORDER_CREATED' || payload.eventType === 'ORDER_UPDATED') {
                await this.importTransactions(restaurantId, [payload.data]);
            }
        }
        catch (error) {
            console.error('Webhook processing failed:', error);
            throw error;
        }
    }
    /**
     * Test connection to Toast API
     */
    async testConnection(restaurantId) {
        try {
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant?.posConfig.isConnected) {
                return false;
            }
            // Try to fetch a small amount of data
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);
            await this.fetchTransactions(restaurantId, startDate, endDate);
            // Update last sync time
            restaurant.posConfig.lastSyncAt = new Date();
            await restaurant.save();
            return true;
        }
        catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
    /**
     * Sync recent transactions (for scheduled jobs)
     */
    async syncRecentTransactions(restaurantId) {
        try {
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant?.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            // Sync last 24 hours
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);
            const toastTransactions = await this.fetchTransactions(restaurantId, startDate, endDate);
            const initialCount = toastTransactions.length;
            await this.importTransactions(restaurantId, toastTransactions);
            // Update last sync time
            restaurant.posConfig.lastSyncAt = new Date();
            await restaurant.save();
            return initialCount;
        }
        catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }
    /**
     * Fetch employee time entries (hours worked) from Toast Labor API
     */
    async fetchTimeEntries(credentials, startDate, endDate) {
        try {
            // Get access token
            const authResponse = await this.authenticateRestaurant(credentials);
            const accessToken = authResponse.token.accessToken;
            // Format dates for Toast API (ISO 8601)
            const startDateStr = startDate.toISOString();
            const endDateStr = endDate.toISOString();
            // Make API request to get time entries
            const response = await axios_1.default.get(`${TOAST_BASE_URL}/labor/v1/timeEntries`, {
                params: {
                    startDate: startDateStr,
                    endDate: endDateStr
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Toast-Restaurant-External-ID': credentials.locationGuid
                }
            });
            return response.data || [];
        }
        catch (error) {
            console.error('Failed to fetch time entries from Toast:', error.response?.data || error.message);
            return [];
        }
    }
}
exports.ToastIntegrationService = ToastIntegrationService;
exports.ToastIntegration = ToastIntegrationService;
// Export singleton instance
exports.toastIntegration = new ToastIntegrationService();
