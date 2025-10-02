import mongoose, { Document, Schema, Types } from 'mongoose';

// Enum for transaction status
export enum TransactionStatus {
  COMPLETED = 'completed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  PENDING = 'pending',
  FAILED = 'failed'
}

// Enum for payment methods
export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  MOBILE_PAYMENT = 'mobile_payment',
  GIFT_CARD = 'gift_card',
  LOYALTY_POINTS = 'loyalty_points',
  CHECK = 'check',
  OTHER = 'other'
}

// Enum for order types
export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEOUT = 'takeout',
  DELIVERY = 'delivery',
  DRIVE_THROUGH = 'drive_through',
  CURBSIDE = 'curbside',
  ONLINE = 'online',
  CATERING = 'catering'
}

// Interface for individual menu items in transaction
export interface ITransactionItem {
  id: string;                    // POS item ID
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // Modifiers and customizations
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  
  // Special instructions or notes
  specialInstructions?: string;
  
  // Discounts applied to this item
  discounts?: Array<{
    id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;           // Actual discount amount
  }>;
  
  // For tracking profitability
  costOfGoods?: number;       // COGS for this item
  margin?: number;            // Calculated profit margin
}

// Interface for payment information
export interface IPaymentInfo {
  method: PaymentMethod;
  amount: number;
  
  // For card payments
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  last4Digits?: string;
  authorizationCode?: string;
  
  // For tips
  tip?: {
    amount: number;
    percentage: number;
    method: 'cash' | 'card' | 'split';
  };
  
  // Processing fees
  processingFee?: number;
}

// Interface for customer information (if available)
export interface ICustomerInfo {
  id?: string;                 // POS customer ID
  name?: string;
  email?: string;
  phone?: string;
  
  // Loyalty program information
  loyaltyMember?: boolean;
  loyaltyId?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  
  // Customer classification
  customerType?: 'new' | 'returning' | 'vip' | 'regular';
  
  // Visit history
  visitCount?: number;
  lastVisit?: Date;
  averageTicket?: number;
}

// Interface for employee information
export interface IEmployeeInfo {
  id: string;                  // POS employee ID
  name?: string;
  role?: string;               // e.g., 'server', 'cashier', 'manager'
  
  // Performance metrics for this transaction
  orderTakeTime?: number;      // Seconds from start to order complete
  serviceTime?: number;        // Total service time in seconds
  
  // Shifts and scheduling
  shiftId?: string;
  clockInTime?: Date;
  hourlyWage?: number;
}

// Interface for timing information
export interface ITimingInfo {
  orderStartedAt: Date;        // When order was initiated
  orderCompletedAt?: Date;     // When order was finalized
  paymentProcessedAt?: Date;   // When payment was processed
  
  // Kitchen/preparation timing
  kitchenStartTime?: Date;
  kitchenCompleteTime?: Date;
  prepTime?: number;           // Minutes to prepare order
  
  // Customer wait times
  waitTime?: number;           // Total customer wait time in minutes
  pickupTime?: Date;           // For takeout/delivery orders
}

// Interface for location information (for multi-location restaurants)
export interface ILocationInfo {
  id?: string;                 // POS location ID
  name?: string;
  address?: string;
  
  // For delivery orders
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Table information for dine-in
  tableNumber?: string;
  seatCount?: number;
}

// Main Transaction interface
export interface ITransaction extends Document {
  // Basic transaction information
  restaurantId: Types.ObjectId;
  posTransactionId: string;     // Unique ID from POS system
  posSystemType: string;        // 'toast', 'square', etc.
  
  // Order details
  orderType: OrderType;
  status: TransactionStatus;
  items: ITransactionItem[];
  
  // Financial information
  subtotal: number;
  tax: number;
  tip: number;
  totalAmount: number;
  
  // Discounts and promotions
  discounts?: Array<{
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'bogo' | 'combo';
    value: number;
    amount: number;           // Actual discount amount
    appliedBy?: string;       // Employee who applied discount
  }>;
  
  // Payment information
  payments: IPaymentInfo[];
  
  // People involved
  customer?: ICustomerInfo;
  employee: IEmployeeInfo;
  
  // Timing and location
  timing: ITimingInfo;
  location?: ILocationInfo;
  
  // Business intelligence fields
  analytics: {
    isUpsellOpportunity: boolean;    // Could have sold more
    missedUpsellValue?: number;      // Potential additional revenue
    customerSatisfactionScore?: number; // If available from POS/survey
    
    // Efficiency metrics
    orderAccuracy: boolean;          // No voids/modifications
    serviceEfficiency: 'fast' | 'average' | 'slow';
    
    // Revenue analysis
    profitMargin?: number;           // If COGS data available
    revenueCategory: 'low' | 'medium' | 'high'; // Based on amount
    
    // Behavioral insights
    isRepeatCustomer: boolean;
    isDuringPeakHours: boolean;
    dayOfWeek: string;
    hourOfDay: number;
    
    // Anomaly flags
    anomalies: Array<{
      type: 'high_discount' | 'long_wait' | 'large_order' | 'unusual_items';
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  
  // Integration metadata
  integration: {
    lastSyncedAt: Date;
    syncVersion: number;
    webhookReceived: boolean;
    rawPOSData?: any;            // Store original POS data for debugging
  };
  
  // Timestamps
  transactionDate: Date;         // When transaction occurred
  createdAt: Date;              // When record was created in our system
  updatedAt: Date;
}

// Mongoose schema definition
const TransactionSchema = new Schema<ITransaction>({
  restaurantId: { 
    type: Schema.Types.ObjectId, 
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
    rawPOSData: { type: Schema.Types.Mixed }
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
TransactionSchema.virtual('serviceTimeMinutes').get(function(this: ITransaction) {
  if (this.timing.orderStartedAt && this.timing.orderCompletedAt) {
    const diffMs = this.timing.orderCompletedAt.getTime() - this.timing.orderStartedAt.getTime();
    return Math.round(diffMs / (1000 * 60)); // Convert to minutes
  }
  return null;
});

// Virtual for calculating items count
TransactionSchema.virtual('itemCount').get(function(this: ITransaction) {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for average item price
TransactionSchema.virtual('averageItemPrice').get(function(this: ITransaction) {
  const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  return totalItems > 0 ? this.subtotal / totalItems : 0;
});

// Virtual for tip percentage
TransactionSchema.virtual('tipPercentage').get(function(this: ITransaction) {
  return this.subtotal > 0 ? (this.tip / this.subtotal) * 100 : 0;
});

// Pre-save middleware to calculate analytics fields
TransactionSchema.pre('save', function(this: ITransaction, next) {
  // Calculate day of week and hour
  this.analytics.dayOfWeek = this.transactionDate.toLocaleDateString('en-US', { weekday: 'long' });
  this.analytics.hourOfDay = this.transactionDate.getHours();
  
  // Determine if during peak hours (11 AM - 2 PM or 6 PM - 9 PM)
  const hour = this.analytics.hourOfDay;
  this.analytics.isDuringPeakHours = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);
  
  // Categorize revenue
  if (this.totalAmount < 15) {
    this.analytics.revenueCategory = 'low';
  } else if (this.totalAmount < 50) {
    this.analytics.revenueCategory = 'medium';
  } else {
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
TransactionSchema.methods.calculateProfit = function(this: ITransaction) {
  const totalCOGS = this.items.reduce((sum, item) => {
    return sum + (item.costOfGoods || 0) * item.quantity;
  }, 0);
  
  return this.subtotal - totalCOGS;
};

TransactionSchema.methods.isHighValue = function(this: ITransaction) {
  return this.totalAmount > 100; // Configurable threshold
};

TransactionSchema.methods.hasLoyaltyCustomer = function(this: ITransaction) {
  return this.customer?.loyaltyMember === true;
};

TransactionSchema.methods.markAsUpsellOpportunity = function(this: ITransaction, missedValue: number) {
  this.analytics.isUpsellOpportunity = true;
  this.analytics.missedUpsellValue = missedValue;
  return this.save();
};

// Static methods
TransactionSchema.statics.findByDateRange = function(restaurantId: string, startDate: Date, endDate: Date) {
  return this.find({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    transactionDate: { $gte: startDate, $lte: endDate }
  }).sort({ transactionDate: -1 });
};

TransactionSchema.statics.findByEmployee = function(restaurantId: string, employeeId: string, startDate?: Date, endDate?: Date) {
  const query: any = {
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    'employee.id': employeeId
  };
  
  if (startDate && endDate) {
    query.transactionDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(query).sort({ transactionDate: -1 });
};

TransactionSchema.statics.getRevenueAnalytics = function(restaurantId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
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

TransactionSchema.statics.getEmployeePerformance = function(restaurantId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
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

TransactionSchema.statics.findUpsellOpportunities = function(restaurantId: string, limit: number = 50) {
  return this.find({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    'analytics.isUpsellOpportunity': true,
    transactionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  })
  .sort({ 'analytics.missedUpsellValue': -1 })
  .limit(limit);
};

// Export the model
export default mongoose.model<ITransaction>('Transaction', TransactionSchema);