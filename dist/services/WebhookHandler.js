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
exports.createWebhookRouter = exports.WebhookHandler = exports.rateLimitWebhook = exports.verifyWebhookSignature = void 0;
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const ToastIntegration_1 = require("./ToastIntegration");
const models_1 = require("../models");
// Webhook verification middleware
const verifyWebhookSignature = async (req, res, next) => {
    try {
        const signature = req.headers['x-toast-signature'];
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
        const restaurant = await models_1.Restaurant.findById(restaurantId);
        if (!restaurant?.posConfig.webhookSecret) {
            res.status(404).json({ error: 'Restaurant not found or webhook not configured' });
            return;
        }
        // Verify signature
        const expectedSignature = crypto_1.default
            .createHmac('sha256', restaurant.posConfig.webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (signature !== expectedSignature) {
            res.status(401).json({ error: 'Invalid webhook signature' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Webhook verification failed:', error);
        res.status(500).json({ error: 'Webhook verification failed' });
    }
};
exports.verifyWebhookSignature = verifyWebhookSignature;
// Rate limiting for webhooks
const webhookRateLimit = new Map();
const WEBHOOK_RATE_LIMIT = 100; // Max 100 webhooks per minute per restaurant
const WEBHOOK_TIME_WINDOW = 60000; // 1 minute
const rateLimitWebhook = (req, res, next) => {
    const restaurantId = req.params.restaurantId;
    const now = Date.now();
    if (!webhookRateLimit.has(restaurantId)) {
        webhookRateLimit.set(restaurantId, []);
    }
    const requests = webhookRateLimit.get(restaurantId);
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
exports.rateLimitWebhook = rateLimitWebhook;
// Main webhook handler class
class WebhookHandler {
    /**
     * Handle Toast POS webhooks
     */
    static async handleToastWebhook(req, res) {
        try {
            const payload = req.body;
            const restaurantId = req.params.restaurantId;
            const signature = req.headers['x-toast-signature'];
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
        }
        catch (error) {
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
    static async processToastEvent(payload, restaurantId, signature) {
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
    static async handleOrderCreated(payload, restaurantId, signature) {
        try {
            console.log(`Processing ORDER_CREATED for restaurant ${restaurantId}`);
            // Use Toast integration service to import the new transaction
            await ToastIntegration_1.toastIntegration.handleWebhook(payload, signature, restaurantId);
            // Update restaurant's last sync time
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (restaurant) {
                restaurant.posConfig.lastSyncAt = new Date();
                await restaurant.save();
            }
            console.log(`ORDER_CREATED processed successfully: ${payload.resourceId}`);
        }
        catch (error) {
            console.error('Failed to process ORDER_CREATED:', error);
            throw error;
        }
    }
    /**
     * Handle order updates
     */
    static async handleOrderUpdated(payload, restaurantId, signature) {
        try {
            console.log(`Processing ORDER_UPDATED for restaurant ${restaurantId}`);
            const Transaction = (await Promise.resolve().then(() => __importStar(require('../models/Transaction')))).default;
            // Find existing transaction
            const existingTransaction = await Transaction.findOne({
                restaurantId: restaurantId,
                posTransactionId: payload.resourceId
            });
            if (existingTransaction) {
                // Update the transaction with new data
                const normalizedData = ToastIntegration_1.toastIntegration.normalizeTransaction(payload.data, restaurantId);
                Object.assign(existingTransaction, normalizedData);
                existingTransaction.integration.lastSyncedAt = new Date();
                existingTransaction.integration.webhookReceived = true;
                await existingTransaction.save();
                console.log(`ORDER_UPDATED processed successfully: ${payload.resourceId}`);
            }
            else {
                // If transaction doesn't exist, create it
                await this.handleOrderCreated(payload, restaurantId, signature);
            }
        }
        catch (error) {
            console.error('Failed to process ORDER_UPDATED:', error);
            throw error;
        }
    }
    /**
     * Handle order deletion
     */
    static async handleOrderDeleted(payload, restaurantId, signature) {
        try {
            console.log(`Processing ORDER_DELETED for restaurant ${restaurantId}`);
            const Transaction = (await Promise.resolve().then(() => __importStar(require('../models/Transaction')))).default;
            // Find and mark transaction as deleted
            const transaction = await Transaction.findOne({
                restaurantId: restaurantId,
                posTransactionId: payload.resourceId
            });
            if (transaction) {
                // Don't actually delete, just mark as voided for audit trail
                transaction.status = 'voided';
                transaction.integration.lastSyncedAt = new Date();
                transaction.integration.webhookReceived = true;
                await transaction.save();
                console.log(`ORDER_DELETED processed successfully: ${payload.resourceId}`);
            }
        }
        catch (error) {
            console.error('Failed to process ORDER_DELETED:', error);
            throw error;
        }
    }
    /**
     * Handle payment events
     */
    static async handlePaymentCreated(payload, restaurantId, signature) {
        try {
            console.log(`Processing PAYMENT_CREATED for restaurant ${restaurantId}`);
            // Payment events usually update existing orders
            await this.handleOrderUpdated(payload, restaurantId, signature);
        }
        catch (error) {
            console.error('Failed to process PAYMENT_CREATED:', error);
            throw error;
        }
    }
    /**
     * Handle menu updates
     */
    static async handleMenuUpdated(payload, restaurantId, signature) {
        try {
            console.log(`Processing MENU_UPDATED for restaurant ${restaurantId}`);
            // TODO: Implement menu synchronization
            // For now, we'll just log the event
            console.log('Menu update received - implementation pending');
        }
        catch (error) {
            console.error('Failed to process MENU_UPDATED:', error);
            throw error;
        }
    }
    /**
     * Handle employee updates
     */
    static async handleEmployeeUpdated(payload, restaurantId, signature) {
        try {
            console.log(`Processing EMPLOYEE_UPDATED for restaurant ${restaurantId}`);
            // TODO: Implement employee synchronization
            // For now, we'll just log the event
            console.log('Employee update received - implementation pending');
        }
        catch (error) {
            console.error('Failed to process EMPLOYEE_UPDATED:', error);
            throw error;
        }
    }
    /**
     * Health check endpoint for webhooks
     */
    static async healthCheck(req, res) {
        try {
            const restaurantId = req.params.restaurantId;
            if (restaurantId) {
                const restaurant = await models_1.Restaurant.findById(restaurantId);
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
            }
            else {
                res.status(200).json({
                    status: 'healthy',
                    service: 'webhook-handler',
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
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
    static async getWebhookStats(req, res) {
        try {
            const restaurantId = req.params.restaurantId;
            if (!restaurantId) {
                res.status(400).json({ error: 'Restaurant ID required' });
                return;
            }
            const Transaction = (await Promise.resolve().then(() => __importStar(require('../models/Transaction')))).default;
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
            const restaurant = await models_1.Restaurant.findById(restaurantId);
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
        }
        catch (error) {
            console.error('Failed to get webhook stats:', error);
            res.status(500).json({
                error: 'Failed to get webhook statistics'
            });
        }
    }
}
exports.WebhookHandler = WebhookHandler;
// Express router setup
const createWebhookRouter = () => {
    const router = express_1.default.Router();
    // Middleware for parsing raw body (needed for signature verification)
    router.use(express_1.default.raw({ type: 'application/json' }));
    // Health check endpoint
    router.get('/health', WebhookHandler.healthCheck);
    router.get('/health/:restaurantId', WebhookHandler.healthCheck);
    // Webhook statistics
    router.get('/stats/:restaurantId', WebhookHandler.getWebhookStats);
    // Main webhook endpoint with middleware chain
    router.post('/toast/:restaurantId', exports.rateLimitWebhook, express_1.default.json(), // Parse JSON after rate limiting
    exports.verifyWebhookSignature, WebhookHandler.handleToastWebhook);
    // Error handling middleware
    router.use((error, req, res, next) => {
        console.error('Webhook router error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    });
    return router;
};
exports.createWebhookRouter = createWebhookRouter;
exports.default = WebhookHandler;
