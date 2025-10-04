import axios, { AxiosInstance, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { Restaurant, POSSystemType } from '../models';
import { ITransaction, TransactionStatus, PaymentMethod, OrderType } from '../models/Transaction';

// Toast API configuration
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
const TOAST_AUTH_URL = 'https://ws-api.toasttab.com/authentication/v1/authentication/login';
const RATE_LIMIT_PER_HOUR = 1000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Interface for Toast API credentials
export interface IToastCredentials {
  clientId: string;
  clientSecret: string;
  userAccessToken?: string;
  managementGroupGuid?: string;
  locationGuid?: string;
}

// Interface for Toast OAuth response
interface IToastAuthResponse {
  token: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  };
  managementGroups: Array<{
    guid: string;
    name: string;
    externalId: string;
  }>;
}

// Interface for Toast transaction data
interface IToastTransaction {
  guid: string;
  entityType: string;
  externalId: string;
  modifiedDate: string;
  deletedDate?: string;
  businessDate: string;
  openedDate: string;
  closedDate?: string;
  promisedDate?: string;
  duration: number;
  diningOption: {
    guid: string;
    entityType: string;
    behavior: string;
  };
  checks: Array<{
    guid: string;
    entityType: string;
    displayNumber: string;
    selections: Array<{
      guid: string;
      entityType: string;
      item: {
        guid: string;
        entityType: string;
      };
      quantity: number;
      unitOfMeasure: string;
      selectionType: string;
      appliedDiscounts?: Array<{
        guid: string;
        entityType: string;
        discount: {
          guid: string;
          entityType: string;
        };
        triggers: Array<{
          selection: {
            guid: string;
            entityType: string;
          };
        }>;
        comboItems?: any[];
        discountAmount: number;
        nonTaxDiscountAmount: number;
        loyaltyDetails?: any;
      }>;
      modifiers?: Array<{
        guid: string;
        entityType: string;
        modifier: {
          guid: string;
          entityType: string;
        };
        quantity: number;
      }>;
      fulfillmentStatus: string;
      taxAmount: number;
      price: number;
      voided: boolean;
      voidReason?: string;
    }>;
    customer?: {
      guid: string;
      entityType: string;
    };
    payments: Array<{
      guid: string;
      entityType: string;
      paidDate: string;
      paymentStatus: string;
      amount: number;
      tipAmount: number;
      amountTendered?: number;
      cardEntryMode?: string;
      lastFour?: string;
      paymentType: string;
    }>;
    appliedLoyaltyInfo?: any;
    taxAmount: number;
    totalAmount: number;
    tabName?: string;
    paymentStatus: string;
    voided: boolean;
    voidReason?: string;
  }>;
  restaurantService?: any;
  source: string;
  duration2?: number;
  createdDevice?: {
    guid: string;
    entityType: string;
  };
  createdEmployee?: {
    guid: string;
    entityType: string;
  };
  modifiedEmployee?: {
    guid: string;
    entityType: string;
  };
  approvedEmployee?: {
    guid: string;
    entityType: string;
  };
  closedEmployee?: {
    guid: string;
    entityType: string;
  };
  deletedEmployee?: {
    guid: string;
    entityType: string;
  };
  server?: {
    guid: string;
    entityType: string;
  };
  orderGuid?: string;
  revenueCenter?: {
    guid: string;
    entityType: string;
  };
  source2?: string;
  guestCount?: number;
  table?: {
    guid: string;
    entityType: string;
  };
  serviceArea?: {
    guid: string;
    entityType: string;
  };
  appliedServiceCharges?: any[];
  numberOfGuests?: number;
  restaurantId: string;
}

// Rate limiting class
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = RATE_LIMIT_PER_HOUR, timeWindow: number = 3600000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow; // 1 hour in milliseconds
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove requests older than time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.timeWindow - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilReset);
  }
}

// Encryption utility for storing sensitive data
class EncryptionUtil {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;
  private static readonly ivLength = 12; // GCM mode uses 12-byte IV

  static encrypt(text: string, password: string): string {
    // Generate key from password
    const key = crypto.createHash('sha256').update(password).digest();

    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher with IV
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

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

  static decrypt(encryptedData: string, password: string): string {
    // Generate key from password
    const key = crypto.createHash('sha256').update(password).digest();

    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = combined.subarray(0, this.ivLength);
    const authTag = combined.subarray(this.ivLength, this.ivLength + 16);
    const encrypted = combined.subarray(this.ivLength + 16);

    // Create decipher with IV
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    // Set auth tag (required for GCM mode)
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Main Toast Integration Service
export class ToastIntegrationService {
  private rateLimiter: RateLimiter;
  private client: AxiosInstance;
  private encryptionKey: string;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    this.client = axios.create({
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
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
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
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response && error.response.status >= 500) ||
      (error.response && error.response.status === 429) // Rate limit
    );
  }

  private delay(ms: number): Promise<void> {
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
  async authenticateRestaurant(credentials: IToastCredentials): Promise<IToastAuthResponse> {
    try {
      const response: AxiosResponse<IToastAuthResponse> = await this.client.post(
        '/authentication/v1/authentication/login',
        {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          userAccessType: 'TOAST_MACHINE_CLIENT'
        }
      );

      if (!response.data.token) {
        throw new Error('Authentication failed: No token received');
      }

      return response.data;
    } catch (error: any) {
      console.error('Toast authentication failed:', error);
      throw new Error(`Toast authentication failed: ${error.message}`);
    }
  }

  /**
   * Connect a restaurant to Toast POS system
   */
  async connectRestaurant(restaurantId: string, credentials: IToastCredentials): Promise<{ success: boolean; ordersImported: number }> {
    try {
      // Authenticate with Toast
      const authResponse = await this.authenticateRestaurant(credentials);

      // Find the restaurant in our database
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Encrypt and store credentials
      const encryptedAccessToken = EncryptionUtil.encrypt(
        authResponse.token.accessToken,
        this.encryptionKey
      );

      // Update restaurant with Toast connection info
      restaurant.posConfig = {
        type: POSSystemType.TOAST,
        isConnected: true,
        clientId: credentials.clientId,
        encryptedAccessToken,
        lastSyncAt: new Date(),
        managementGroupId: authResponse.managementGroups?.[0]?.guid,
        locationId: credentials.locationGuid
      };

      await restaurant.save();

      // Perform initial data sync and get imported count
      const ordersImported = await this.performInitialSync(restaurant._id as string, authResponse.token.accessToken);

      return { success: true, ordersImported };
    } catch (error) {
      console.error('Failed to connect restaurant to Toast:', error);
      throw error;
    }
  }

  /**
   * Disconnect restaurant from Toast POS
   */
  async disconnectRestaurant(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Failed to disconnect restaurant from Toast:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from Toast API
   * Note: Using /ordersBulk endpoint which supports up to 30-day date ranges
   */
  async fetchTransactions(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IToastTransaction[]> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig.isConnected) {
        throw new Error('Restaurant not connected to Toast');
      }

      // Decrypt access token
      const accessToken = EncryptionUtil.decrypt(
        restaurant.posConfig.encryptedAccessToken!,
        this.encryptionKey
      );

      // Use /ordersBulk endpoint which supports up to 30-day ranges
      // Break into 30-day chunks if the date range is longer
      const allTransactions: IToastTransaction[] = [];
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      let currentStart = new Date(startDate.getTime());
      const finalEnd = new Date(endDate.getTime());

      console.log(`Fetching Toast transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      let chunkCount = 0;
      while (currentStart < finalEnd) {
        // Calculate end of this chunk (max 30 days)
        const currentEnd = new Date(Math.min(
          currentStart.getTime() + thirtyDaysMs,
          finalEnd.getTime()
        ));

        chunkCount++;
        console.log(`Fetching chunk ${chunkCount}: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);

        try {
          // Paginate through all pages for this date range using page numbers
          // Note: /ordersBulk uses 'page' parameter, not 'pageToken'
          let hasMorePages = true;
          let chunkTotal = 0;
          let page = 1;

          while (hasMorePages) {
            const response = await this.client.get(
              `/orders/v2/ordersBulk`,
              {
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
              }
            );

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
            } else {
              hasMorePages = false;
            }
          }
        } catch (error) {
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
    } catch (error) {
      console.error('Failed to fetch transactions from Toast:', error);
      throw error;
    }
  }

  /**
   * Normalize Toast transaction data to our schema
   */
  normalizeTransaction(toastTransaction: IToastTransaction, restaurantId: string): Partial<ITransaction> {
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
          type: 'fixed' as const,
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
            tipPercentage = Math.min(
              (payment.tipAmount / preTipAmount) * 100,
              100
            );
          }
          // If pre-tip amount is 0 or negative (refunds/voids), set to 0
          else {
            tipPercentage = 0;
          }
        }

        return {
          method: this.mapToastPaymentMethod(payment.paymentType),
          amount: payment.amount,
          cardType: payment.lastFour ? 'other' as const : undefined,
          last4Digits: payment.lastFour,
          tip: payment.tipAmount > 0 ? {
            amount: payment.tipAmount,
            percentage: tipPercentage,
            method: 'card' as const
          } : undefined
        };
      });

      // Map order type
      const orderType = this.mapToastOrderType(toastTransaction.diningOption?.behavior);

      // Map transaction status
      const status = check.voided ? TransactionStatus.VOIDED : 
                    check.paymentStatus === 'PAID' ? TransactionStatus.COMPLETED : 
                    TransactionStatus.PENDING;

      return {
        restaurantId: restaurantId as any,
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
          serviceEfficiency: 'average' as const,
          revenueCategory: 'medium' as const, // Will be calculated in pre-save
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
        transactionDate: new Date(toastTransaction.openedDate)  // Use openedDate instead of businessDate
      };
    } catch (error) {
      console.error('Failed to normalize Toast transaction:', error);
      throw error;
    }
  }

  private mapToastPaymentMethod(toastPaymentType: string): PaymentMethod {
    switch (toastPaymentType?.toLowerCase()) {
      case 'cash':
        return PaymentMethod.CASH;
      case 'credit':
      case 'credit_card':
        return PaymentMethod.CREDIT_CARD;
      case 'debit':
      case 'debit_card':
        return PaymentMethod.DEBIT_CARD;
      case 'gift_card':
        return PaymentMethod.GIFT_CARD;
      case 'loyalty':
        return PaymentMethod.LOYALTY_POINTS;
      default:
        return PaymentMethod.OTHER;
    }
  }

  private mapToastOrderType(diningBehavior: string): OrderType {
    switch (diningBehavior?.toLowerCase()) {
      case 'dine_in':
      case 'eat_in':
        return OrderType.DINE_IN;
      case 'takeout':
      case 'take_out':
        return OrderType.TAKEOUT;
      case 'delivery':
        return OrderType.DELIVERY;
      case 'drive_thru':
      case 'drive_through':
        return OrderType.DRIVE_THROUGH;
      case 'curbside':
        return OrderType.CURBSIDE;
      default:
        return OrderType.DINE_IN;
    }
  }

  /**
   * Perform initial sync of historical data
   * Returns the number of transactions imported
   */
  async performInitialSync(restaurantId: string, accessToken: string): Promise<number> {
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
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  /**
   * Import transactions into our database
   * Returns the number of transactions successfully imported
   */
  async importTransactions(restaurantId: string, toastTransactions: IToastTransaction[]): Promise<number> {
    const { Transaction } = await import('../models');
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

      } catch (error) {
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
  async handleWebhook(payload: any, signature: string, restaurantId: string): Promise<void> {
    try {
      // Verify webhook signature
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant?.posConfig.webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const expectedSignature = crypto
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

    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Toast API
   */
  async testConnection(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync recent transactions (for scheduled jobs)
   */
  async syncRecentTransactions(restaurantId: string): Promise<number> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch employee time entries (hours worked) from Toast Labor API
   */
  async fetchTimeEntries(
    credentials: IToastCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      // Get access token
      const authResponse = await this.authenticateRestaurant(credentials);
      const accessToken = authResponse.token.accessToken;

      // Format dates for Toast API (ISO 8601)
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      // Make API request to get time entries
      const response = await axios.get(
        `${TOAST_BASE_URL}/labor/v1/timeEntries`,
        {
          params: {
            startDate: startDateStr,
            endDate: endDateStr
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': credentials.locationGuid
          }
        }
      );

      return response.data || [];
    } catch (error: any) {
      console.error('Failed to fetch time entries from Toast:', error.response?.data || error.message);
      return [];
    }
  }
}

// Export singleton instance
export const toastIntegration = new ToastIntegrationService();
export { ToastIntegrationService as ToastIntegration };