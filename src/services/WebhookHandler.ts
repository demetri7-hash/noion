import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { toastIntegration } from './ToastIntegration';
import { Restaurant } from '../models';

// Interface for webhook payload
interface IWebhookPayload {
  eventType: string;
  eventTime: string;
  resourceId: string;
  data: any;
  restaurantGuid: string;
  managementGroupGuid: string;
}

// Webhook verification middleware
export const verifyWebhookSignature = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-toast-signature'] as string;
    const restaurantId = req.params.restaurantId;

    if (!signature) {
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ error: 'Missing restaurant ID' });
      return;
    }

    // Get restaurant and webhook secret
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant?.posConfig.webhookSecret) {
      res.status(404).json({ error: 'Restaurant not found or webhook not configured' });
      return;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', restaurant.posConfig.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    next();
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(500).json({ error: 'Webhook verification failed' });
  }
};

// Rate limiting for webhooks
const webhookRateLimit = new Map<string, number[]>();
const WEBHOOK_RATE_LIMIT = 100; // Max 100 webhooks per minute per restaurant
const WEBHOOK_TIME_WINDOW = 60000; // 1 minute

export const rateLimitWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const restaurantId = req.params.restaurantId;
  const now = Date.now();
  
  if (!webhookRateLimit.has(restaurantId)) {
    webhookRateLimit.set(restaurantId, []);
  }
  
  const requests = webhookRateLimit.get(restaurantId)!;
  
  // Remove old requests
  const recentRequests = requests.filter(time => now - time < WEBHOOK_TIME_WINDOW);
  
  if (recentRequests.length >= WEBHOOK_RATE_LIMIT) {
    res.status(429).json({ error: 'Webhook rate limit exceeded' });
    return;
  }
  
  recentRequests.push(now);
  webhookRateLimit.set(restaurantId, recentRequests);
  
  next();
};

// Main webhook handler class
export class WebhookHandler {
  
  /**
   * Handle Toast POS webhooks
   */
  static async handleToastWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: IWebhookPayload = req.body;
      const restaurantId = req.params.restaurantId;
      const signature = req.headers['x-toast-signature'] as string;

      console.log(`Received Toast webhook for restaurant ${restaurantId}:`, payload.eventType);

      // Process the webhook based on event type
      await WebhookHandler.processToastEvent(payload, restaurantId, signature);

      // Respond quickly to Toast
      res.status(200).json({ 
        status: 'success', 
        message: 'Webhook processed successfully',
        eventType: payload.eventType,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Toast webhook processing failed:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed', 
        message: error.message 
      });
    }
  }

  /**
   * Process Toast webhook events
   */
  private static async processToastEvent(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    
    switch (payload.eventType) {
      case 'ORDER_CREATED':
        await this.handleOrderCreated(payload, restaurantId, signature);
        break;
        
      case 'ORDER_UPDATED':
        await this.handleOrderUpdated(payload, restaurantId, signature);
        break;
        
      case 'ORDER_DELETED':
        await this.handleOrderDeleted(payload, restaurantId, signature);
        break;
        
      case 'PAYMENT_CREATED':
        await this.handlePaymentCreated(payload, restaurantId, signature);
        break;
        
      case 'MENU_UPDATED':
        await this.handleMenuUpdated(payload, restaurantId, signature);
        break;
        
      case 'EMPLOYEE_UPDATED':
        await this.handleEmployeeUpdated(payload, restaurantId, signature);
        break;
        
      default:
        console.log(`Unhandled Toast webhook event: ${payload.eventType}`);
    }
  }

  /**
   * Handle new order creation
   */
  private static async handleOrderCreated(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing ORDER_CREATED for restaurant ${restaurantId}`);
      
      // Use Toast integration service to import the new transaction
      await toastIntegration.handleWebhook(payload, signature, restaurantId);
      
      // Update restaurant's last sync time
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant) {
        restaurant.posConfig.lastSyncAt = new Date();
        await restaurant.save();
      }
      
      console.log(`ORDER_CREATED processed successfully: ${payload.resourceId}`);
      
    } catch (error) {
      console.error('Failed to process ORDER_CREATED:', error);
      throw error;
    }
  }

  /**
   * Handle order updates
   */
  private static async handleOrderUpdated(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing ORDER_UPDATED for restaurant ${restaurantId}`);
      
      const Transaction = (await import('../models/Transaction')).default;
      
      // Find existing transaction
      const existingTransaction = await Transaction.findOne({
        restaurantId: restaurantId,
        posTransactionId: payload.resourceId
      });

      if (existingTransaction) {
        // Update the transaction with new data
        const normalizedData = toastIntegration.normalizeTransaction(payload.data, restaurantId);
        
        Object.assign(existingTransaction, normalizedData);
        existingTransaction.integration.lastSyncedAt = new Date();
        existingTransaction.integration.webhookReceived = true;
        
        await existingTransaction.save();
        console.log(`ORDER_UPDATED processed successfully: ${payload.resourceId}`);
      } else {
        // If transaction doesn't exist, create it
        await this.handleOrderCreated(payload, restaurantId, signature);
      }
      
    } catch (error) {
      console.error('Failed to process ORDER_UPDATED:', error);
      throw error;
    }
  }

  /**
   * Handle order deletion
   */
  private static async handleOrderDeleted(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing ORDER_DELETED for restaurant ${restaurantId}`);
      
      const Transaction = (await import('../models/Transaction')).default;
      
      // Find and mark transaction as deleted
      const transaction = await Transaction.findOne({
        restaurantId: restaurantId,
        posTransactionId: payload.resourceId
      });

      if (transaction) {
        // Don't actually delete, just mark as voided for audit trail
        transaction.status = 'voided' as any;
        transaction.integration.lastSyncedAt = new Date();
        transaction.integration.webhookReceived = true;
        
        await transaction.save();
        console.log(`ORDER_DELETED processed successfully: ${payload.resourceId}`);
      }
      
    } catch (error) {
      console.error('Failed to process ORDER_DELETED:', error);
      throw error;
    }
  }

  /**
   * Handle payment events
   */
  private static async handlePaymentCreated(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing PAYMENT_CREATED for restaurant ${restaurantId}`);
      
      // Payment events usually update existing orders
      await this.handleOrderUpdated(payload, restaurantId, signature);
      
    } catch (error) {
      console.error('Failed to process PAYMENT_CREATED:', error);
      throw error;
    }
  }

  /**
   * Handle menu updates
   */
  private static async handleMenuUpdated(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing MENU_UPDATED for restaurant ${restaurantId}`);
      
      // TODO: Implement menu synchronization
      // For now, we'll just log the event
      console.log('Menu update received - implementation pending');
      
    } catch (error) {
      console.error('Failed to process MENU_UPDATED:', error);
      throw error;
    }
  }

  /**
   * Handle employee updates
   */
  private static async handleEmployeeUpdated(
    payload: IWebhookPayload, 
    restaurantId: string, 
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing EMPLOYEE_UPDATED for restaurant ${restaurantId}`);
      
      // TODO: Implement employee synchronization
      // For now, we'll just log the event
      console.log('Employee update received - implementation pending');
      
    } catch (error) {
      console.error('Failed to process EMPLOYEE_UPDATED:', error);
      throw error;
    }
  }

  /**
   * Health check endpoint for webhooks
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const restaurantId = req.params.restaurantId;
      
      if (restaurantId) {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          res.status(404).json({ error: 'Restaurant not found' });
          return;
        }
        
        res.status(200).json({
          status: 'healthy',
          restaurant: restaurant.name,
          posConnected: restaurant.posConfig.isConnected,
          lastSync: restaurant.posConfig.lastSyncAt,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(200).json({
          status: 'healthy',
          service: 'webhook-handler',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'unhealthy', 
        error: 'Health check failed' 
      });
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(req: Request, res: Response): Promise<void> {
    try {
      const restaurantId = req.params.restaurantId;
      
      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID required' });
        return;
      }

      const Transaction = (await import('../models/Transaction')).default;
      
      // Get webhook statistics
      const stats = await Transaction.aggregate([
        { $match: { restaurantId: restaurantId } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            webhookReceived: { 
              $sum: { $cond: ['$integration.webhookReceived', 1, 0] } 
            },
            lastWebhookDate: { $max: '$integration.lastSyncedAt' },
            avgSyncVersion: { $avg: '$integration.syncVersion' }
          }
        }
      ]);

      const restaurant = await Restaurant.findById(restaurantId);
      
      res.status(200).json({
        restaurantId,
        restaurantName: restaurant?.name,
        stats: stats[0] || {
          totalTransactions: 0,
          webhookReceived: 0,
          lastWebhookDate: null,
          avgSyncVersion: 0
        },
        webhookConfig: {
          isConfigured: !!restaurant?.posConfig.webhookSecret,
          lastSync: restaurant?.posConfig.lastSyncAt
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      res.status(500).json({ 
        error: 'Failed to get webhook statistics' 
      });
    }
  }
}

// Express router setup
export const createWebhookRouter = (): express.Router => {
  const router = express.Router();

  // Middleware for parsing raw body (needed for signature verification)
  router.use(express.raw({ type: 'application/json' }));

  // Health check endpoint
  router.get('/health', WebhookHandler.healthCheck);
  router.get('/health/:restaurantId', WebhookHandler.healthCheck);

  // Webhook statistics
  router.get('/stats/:restaurantId', WebhookHandler.getWebhookStats);

  // Main webhook endpoint with middleware chain
  router.post('/toast/:restaurantId', 
    rateLimitWebhook,
    express.json(), // Parse JSON after rate limiting
    verifyWebhookSignature,
    WebhookHandler.handleToastWebhook
  );

  // Error handling middleware
  router.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Webhook router error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

export default WebhookHandler;