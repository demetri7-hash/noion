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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderType = exports.PaymentMethod = exports.TransactionStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum for transaction status
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["VOIDED"] = "voided";
    TransactionStatus["REFUNDED"] = "refunded";
    TransactionStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["FAILED"] = "failed";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
// Enum for payment methods
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["DEBIT_CARD"] = "debit_card";
    PaymentMethod["MOBILE_PAYMENT"] = "mobile_payment";
    PaymentMethod["GIFT_CARD"] = "gift_card";
    PaymentMethod["LOYALTY_POINTS"] = "loyalty_points";
    PaymentMethod["CHECK"] = "check";
    PaymentMethod["OTHER"] = "other";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// Enum for order types
var OrderType;
(function (OrderType) {
    OrderType["DINE_IN"] = "dine_in";
    OrderType["TAKEOUT"] = "takeout";
    OrderType["DELIVERY"] = "delivery";
    OrderType["DRIVE_THROUGH"] = "drive_through";
    OrderType["CURBSIDE"] = "curbside";
    OrderType["ONLINE"] = "online";
    OrderType["CATERING"] = "catering";
})(OrderType || (exports.OrderType = OrderType = {}));
// Mongoose schema definition
const TransactionSchema = new mongoose_1.Schema({
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    posTransactionId: {
        type: String,
        required: true,
        index: true
    },
    posSystemType: {
        type: String,
        required: true
    },
    // Order details
    orderType: {
        type: String,
        enum: Object.values(OrderType),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        required: true
    },
    // Items in the order
    items: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            category: { type: String, required: true },
            quantity: { type: Number, required: true, min: 0 },
            unitPrice: { type: Number, required: true, min: 0 },
            totalPrice: { type: Number, required: true, min: 0 },
            modifiers: [{
                    id: { type: String, required: true },
                    name: { type: String, required: true },
                    price: { type: Number, required: true }
                }],
            specialInstructions: { type: String },
            discounts: [{
                    id: { type: String, required: true },
                    name: { type: String, required: true },
                    type: {
                        type: String,
                        enum: ['percentage', 'fixed'],
                        required: true
                    },
                    value: { type: Number, required: true },
                    amount: { type: Number, required: true }
                }],
            costOfGoods: { type: Number, min: 0 },
            margin: { type: Number }
        }],
    // Financial totals
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    // Order-level discounts
    discounts: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            type: {
                type: String,
                enum: ['percentage', 'fixed', 'bogo', 'combo'],
                required: true
            },
            value: { type: Number, required: true },
            amount: { type: Number, required: true },
            appliedBy: { type: String }
        }],
    // Payment information
    payments: [{
            method: {
                type: String,
                enum: Object.values(PaymentMethod),
                required: true
            },
            amount: { type: Number, required: true, min: 0 },
            cardType: {
                type: String,
                enum: ['visa', 'mastercard', 'amex', 'discover', 'other']
            },
            last4Digits: { type: String },
            authorizationCode: { type: String },
            tip: {
                amount: { type: Number, min: 0 },
                percentage: { type: Number, min: 0, max: 100 },
                method: {
                    type: String,
                    enum: ['cash', 'card', 'split']
                }
            },
            processingFee: { type: Number, min: 0 }
        }],
    // Customer information
    customer: {
        id: { type: String },
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        loyaltyMember: { type: Boolean, default: false },
        loyaltyId: { type: String },
        loyaltyPointsEarned: { type: Number, min: 0 },
        loyaltyPointsRedeemed: { type: Number, min: 0 },
        customerType: {
            type: String,
            enum: ['new', 'returning', 'vip', 'regular']
        },
        visitCount: { type: Number, min: 0 },
        lastVisit: { type: Date },
        averageTicket: { type: Number, min: 0 }
    },
    // Employee information
    employee: {
        id: { type: String, required: true },
        name: { type: String },
        role: { type: String },
        orderTakeTime: { type: Number, min: 0 },
        serviceTime: { type: Number, min: 0 },
        shiftId: { type: String },
        clockInTime: { type: Date },
        hourlyWage: { type: Number, min: 0 }
    },
    // Timing information
    timing: {
        orderStartedAt: { type: Date, required: true },
        orderCompletedAt: { type: Date },
        paymentProcessedAt: { type: Date },
        kitchenStartTime: { type: Date },
        kitchenCompleteTime: { type: Date },
        prepTime: { type: Number, min: 0 },
        waitTime: { type: Number, min: 0 },
        pickupTime: { type: Date }
    },
    // Location information
    location: {
        id: { type: String },
        name: { type: String },
        address: { type: String },
        deliveryAddress: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            zipCode: { type: String },
            coordinates: {
                latitude: { type: Number },
                longitude: { type: Number }
            }
        },
        tableNumber: { type: String },
        seatCount: { type: Number, min: 1 }
    },
    // Analytics and insights
    analytics: {
        isUpsellOpportunity: { type: Boolean, default: false },
        missedUpsellValue: { type: Number, min: 0 },
        customerSatisfactionScore: { type: Number, min: 1, max: 10 },
        orderAccuracy: { type: Boolean, default: true },
        serviceEfficiency: {
            type: String,
            enum: ['fast', 'average', 'slow'],
            default: 'average'
        },
        profitMargin: { type: Number },
        revenueCategory: {
            type: String,
            enum: ['low', 'medium', 'high'],
            required: true
        },
        isRepeatCustomer: { type: Boolean, default: false },
        isDuringPeakHours: { type: Boolean, required: true },
        dayOfWeek: { type: String, required: true },
        hourOfDay: { type: Number, min: 0, max: 23, required: true },
        anomalies: [{
                type: {
                    type: String,
                    enum: ['high_discount', 'long_wait', 'large_order', 'unusual_items'],
                    required: true
                },
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                    required: true
                },
                description: { type: String, required: true }
            }]
    },
    // Integration metadata
    integration: {
        lastSyncedAt: { type: Date, default: Date.now },
        syncVersion: { type: Number, default: 1 },
        webhookReceived: { type: Boolean, default: false },
        rawPOSData: { type: mongoose_1.Schema.Types.Mixed }
    },
    // Transaction timestamp
    transactionDate: { type: Date, required: true, index: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Compound indexes for performance
TransactionSchema.index({ restaurantId: 1, transactionDate: -1 });
TransactionSchema.index({ restaurantId: 1, posTransactionId: 1 }, { unique: true });
TransactionSchema.index({ restaurantId: 1, 'employee.id': 1, transactionDate: -1 });
TransactionSchema.index({ restaurantId: 1, status: 1 });
TransactionSchema.index({ restaurantId: 1, orderType: 1 });
TransactionSchema.index({ 'customer.id': 1, transactionDate: -1 });
TransactionSchema.index({ transactionDate: 1, totalAmount: -1 });
// Virtual for calculating service time
TransactionSchema.virtual('serviceTimeMinutes').get(function () {
    if (this.timing.orderStartedAt && this.timing.orderCompletedAt) {
        const diffMs = this.timing.orderCompletedAt.getTime() - this.timing.orderStartedAt.getTime();
        return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    }
    return null;
});
// Virtual for calculating items count
TransactionSchema.virtual('itemCount').get(function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});
// Virtual for average item price
TransactionSchema.virtual('averageItemPrice').get(function () {
    const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    return totalItems > 0 ? this.subtotal / totalItems : 0;
});
// Virtual for tip percentage
TransactionSchema.virtual('tipPercentage').get(function () {
    return this.subtotal > 0 ? (this.tip / this.subtotal) * 100 : 0;
});
// Pre-save middleware to calculate analytics fields
TransactionSchema.pre('save', function (next) {
    // Calculate day of week and hour
    this.analytics.dayOfWeek = this.transactionDate.toLocaleDateString('en-US', { weekday: 'long' });
    this.analytics.hourOfDay = this.transactionDate.getHours();
    // Determine if during peak hours (11 AM - 2 PM or 6 PM - 9 PM)
    const hour = this.analytics.hourOfDay;
    this.analytics.isDuringPeakHours = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);
    // Categorize revenue
    if (this.totalAmount < 15) {
        this.analytics.revenueCategory = 'low';
    }
    else if (this.totalAmount < 50) {
        this.analytics.revenueCategory = 'medium';
    }
    else {
        this.analytics.revenueCategory = 'high';
    }
    // Check for anomalies
    this.analytics.anomalies = [];
    // High discount anomaly
    const totalDiscountAmount = (this.discounts || []).reduce((sum, discount) => sum + discount.amount, 0);
    if (totalDiscountAmount > this.subtotal * 0.3) { // More than 30% discount
        this.analytics.anomalies.push({
            type: 'high_discount',
            severity: totalDiscountAmount > this.subtotal * 0.5 ? 'high' : 'medium',
            description: `High discount applied: ${((totalDiscountAmount / this.subtotal) * 100).toFixed(1)}%`
        });
    }
    // Long wait time anomaly
    if (this.timing.waitTime && this.timing.waitTime > 20) { // More than 20 minutes
        this.analytics.anomalies.push({
            type: 'long_wait',
            severity: this.timing.waitTime > 40 ? 'high' : 'medium',
            description: `Long wait time: ${this.timing.waitTime} minutes`
        });
    }
    // Large order anomaly
    if (this.totalAmount > 200) {
        this.analytics.anomalies.push({
            type: 'large_order',
            severity: this.totalAmount > 500 ? 'high' : 'medium',
            description: `Large order: $${this.totalAmount.toFixed(2)}`
        });
    }
    next();
});
// Instance methods
TransactionSchema.methods.calculateProfit = function () {
    const totalCOGS = this.items.reduce((sum, item) => {
        return sum + (item.costOfGoods || 0) * item.quantity;
    }, 0);
    return this.subtotal - totalCOGS;
};
TransactionSchema.methods.isHighValue = function () {
    return this.totalAmount > 100; // Configurable threshold
};
TransactionSchema.methods.hasLoyaltyCustomer = function () {
    return this.customer?.loyaltyMember === true;
};
TransactionSchema.methods.markAsUpsellOpportunity = function (missedValue) {
    this.analytics.isUpsellOpportunity = true;
    this.analytics.missedUpsellValue = missedValue;
    return this.save();
};
// Static methods
TransactionSchema.statics.findByDateRange = function (restaurantId, startDate, endDate) {
    return this.find({
        restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
        transactionDate: { $gte: startDate, $lte: endDate }
    }).sort({ transactionDate: -1 });
};
TransactionSchema.statics.findByEmployee = function (restaurantId, employeeId, startDate, endDate) {
    const query = {
        restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
        'employee.id': employeeId
    };
    if (startDate && endDate) {
        query.transactionDate = { $gte: startDate, $lte: endDate };
    }
    return this.find(query).sort({ transactionDate: -1 });
};
TransactionSchema.statics.getRevenueAnalytics = function (restaurantId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
                transactionDate: { $gte: startDate, $lte: endDate },
                status: TransactionStatus.COMPLETED
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } }
                },
                totalRevenue: { $sum: '$totalAmount' },
                totalTransactions: { $sum: 1 },
                averageTicket: { $avg: '$totalAmount' },
                totalTips: { $sum: '$tip' }
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);
};
TransactionSchema.statics.getEmployeePerformance = function (restaurantId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
                transactionDate: { $gte: startDate, $lte: endDate },
                status: TransactionStatus.COMPLETED
            }
        },
        {
            $group: {
                _id: '$employee.id',
                employeeName: { $first: '$employee.name' },
                totalSales: { $sum: '$totalAmount' },
                transactionCount: { $sum: 1 },
                averageTicket: { $avg: '$totalAmount' },
                totalTips: { $sum: '$tip' },
                averageServiceTime: { $avg: '$employee.serviceTime' }
            }
        },
        { $sort: { totalSales: -1 } }
    ]);
};
TransactionSchema.statics.findUpsellOpportunities = function (restaurantId, limit = 50) {
    return this.find({
        restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId),
        'analytics.isUpsellOpportunity': true,
        transactionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
        .sort({ 'analytics.missedUpsellValue': -1 })
        .limit(limit);
};
// Export the model (handle Next.js hot reload in dev mode)
exports.default = mongoose_1.default.models.Transaction ||
    mongoose_1.default.model('Transaction', TransactionSchema);
