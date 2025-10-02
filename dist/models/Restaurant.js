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
exports.RestaurantStatus = exports.SubscriptionTier = exports.POSSystemType = exports.RestaurantType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum for restaurant types
var RestaurantType;
(function (RestaurantType) {
    RestaurantType["QUICK_SERVICE"] = "quick_service";
    RestaurantType["CASUAL_DINING"] = "casual_dining";
    RestaurantType["FINE_DINING"] = "fine_dining";
    RestaurantType["FAST_CASUAL"] = "fast_casual";
    RestaurantType["CAFE"] = "cafe";
    RestaurantType["BAR"] = "bar";
    RestaurantType["FOOD_TRUCK"] = "food_truck";
    RestaurantType["OTHER"] = "other";
})(RestaurantType || (exports.RestaurantType = RestaurantType = {}));
// Enum for POS system types
var POSSystemType;
(function (POSSystemType) {
    POSSystemType["TOAST"] = "toast";
    POSSystemType["SQUARE"] = "square";
    POSSystemType["CLOVER"] = "clover";
    POSSystemType["REVEL"] = "revel";
    POSSystemType["LIGHTSPEED"] = "lightspeed";
    POSSystemType["SHOPKEEP"] = "shopkeep";
    POSSystemType["OTHER"] = "other";
})(POSSystemType || (exports.POSSystemType = POSSystemType = {}));
// Enum for subscription tiers
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["PULSE"] = "pulse";
    SubscriptionTier["INTELLIGENCE"] = "intelligence";
    SubscriptionTier["COMMAND"] = "command"; // $2,500-10K/month - Enterprise multi-location
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
// Enum for restaurant status
var RestaurantStatus;
(function (RestaurantStatus) {
    RestaurantStatus["TRIAL"] = "trial";
    RestaurantStatus["ACTIVE"] = "active";
    RestaurantStatus["SUSPENDED"] = "suspended";
    RestaurantStatus["CHURNED"] = "churned";
    RestaurantStatus["PENDING_SETUP"] = "pending_setup";
})(RestaurantStatus || (exports.RestaurantStatus = RestaurantStatus = {}));
// Mongoose schema definition
const RestaurantSchema = new mongoose_1.Schema({
    // Owner information
    owner: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
        },
        phone: { type: String, required: true },
        title: { type: String, trim: true },
        password: { type: String, required: true },
        role: { type: String, default: 'restaurant_owner' },
        passwordResetToken: { type: String },
        passwordResetExpires: { type: Date },
        failedLoginAttempts: { type: Number, default: 0 },
        lockoutUntil: { type: Date },
        lastLoginAt: { type: Date }
    },
    // Restaurant details
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: Object.values(RestaurantType),
        required: true
    },
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, default: 'US' },
        latitude: { type: Number },
        longitude: { type: Number }
    },
    website: { type: String },
    phoneNumber: { type: String },
    // POS system integration
    posConfig: {
        type: {
            type: String,
            enum: Object.values(POSSystemType),
            required: true,
            default: POSSystemType.OTHER
        },
        isConnected: { type: Boolean, default: false },
        clientId: { type: String },
        encryptedAccessToken: { type: String },
        encryptedRefreshToken: { type: String },
        lastSyncAt: { type: Date },
        webhookUrl: { type: String },
        webhookSecret: { type: String },
        locationId: { type: String },
        managementGroupId: { type: String }
    },
    // Subscription and billing
    subscription: {
        plan: { type: String, default: 'trial' },
        tier: {
            type: String,
            enum: Object.values(SubscriptionTier),
            default: SubscriptionTier.PULSE
        },
        status: {
            type: String,
            enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing'],
            default: 'trialing'
        },
        startDate: { type: Date, default: Date.now },
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: 'monthly'
        },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'USD' },
        stripeCustomerId: { type: String },
        stripeSubscriptionId: { type: String },
        currentPeriodStart: { type: Date },
        currentPeriodEnd: { type: Date },
        nextBillingDate: { type: Date },
        cancelledAt: { type: Date },
        cancelAtPeriodEnd: { type: Boolean, default: false },
        trialEndsAt: {
            type: Date,
            default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        }
    },
    // Billing information
    billing: {
        stripeCustomerId: { type: String },
        paymentHistory: [{
                invoiceId: String,
                amount: Number,
                currency: String,
                status: {
                    type: String,
                    enum: ['succeeded', 'failed', 'pending']
                },
                paidAt: Date
            }],
        lastPaymentDate: { type: Date },
        nextPaymentDate: { type: Date },
        paymentMethodId: { type: String }
    },
    // Status and settings
    status: {
        type: String,
        enum: Object.values(RestaurantStatus),
        default: RestaurantStatus.TRIAL
    },
    analyticsSettings: {
        timezone: { type: String, default: 'America/New_York' },
        businessHours: {
            monday: { open: String, close: String, closed: { type: Boolean, default: false } },
            tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
            friday: { open: String, close: String, closed: { type: Boolean, default: false } },
            saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
            sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
        },
        averageTicketGoal: { type: Number },
        revenueGoal: { type: Number },
        laborCostPercentageGoal: { type: Number, min: 0, max: 100 },
        enableEmailReports: { type: Boolean, default: true },
        reportFrequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            default: 'weekly'
        }
    },
    // Feature flags
    features: {
        discoveryReportSent: { type: Boolean, default: false },
        hasViewedDashboard: { type: Boolean, default: false },
        hasGeneratedReport: { type: Boolean, default: false },
        enableVideoAnalytics: { type: Boolean, default: false },
        enableAudioAnalytics: { type: Boolean, default: false },
        enablePredictiveAnalytics: { type: Boolean, default: false }
    },
    // Metadata
    lastLoginAt: { type: Date },
    onboardingCompletedAt: { type: Date }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
RestaurantSchema.index({ 'owner.email': 1 }, { unique: true });
RestaurantSchema.index({ status: 1 });
RestaurantSchema.index({ 'subscription.tier': 1 });
RestaurantSchema.index({ 'posConfig.type': 1 });
RestaurantSchema.index({ createdAt: -1 });
RestaurantSchema.index({ 'subscription.trialEndsAt': 1 });
// Virtual for checking if trial is expired
RestaurantSchema.virtual('isTrialExpired').get(function () {
    if (this.status !== RestaurantStatus.TRIAL)
        return false;
    return this.subscription.trialEndsAt ? new Date() > this.subscription.trialEndsAt : false;
});
// Virtual for days until trial expires
RestaurantSchema.virtual('daysUntilTrialExpires').get(function () {
    if (this.status !== RestaurantStatus.TRIAL || !this.subscription.trialEndsAt)
        return 0;
    const now = new Date();
    const trialEnd = this.subscription.trialEndsAt;
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
});
// Pre-save middleware to validate business hours format
RestaurantSchema.pre('save', function (next) {
    // Validate business hours format (HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const day of Object.keys(this.analyticsSettings.businessHours)) {
        const hours = this.analyticsSettings.businessHours[day];
        if (!hours.closed && hours.open && hours.close) {
            if (!timePattern.test(hours.open) || !timePattern.test(hours.close)) {
                return next(new Error(`Invalid time format for ${day}. Use HH:MM format.`));
            }
        }
    }
    next();
});
// Instance methods
RestaurantSchema.methods.connectPOS = function (posType, credentials) {
    this.posConfig.type = posType;
    this.posConfig.isConnected = true;
    this.posConfig.lastSyncAt = new Date();
    // Store encrypted credentials
    if (credentials.accessToken) {
        // TODO: Implement proper encryption
        this.posConfig.encryptedAccessToken = credentials.accessToken;
    }
    return this.save();
};
RestaurantSchema.methods.disconnectPOS = function () {
    this.posConfig.isConnected = false;
    this.posConfig.encryptedAccessToken = undefined;
    this.posConfig.encryptedRefreshToken = undefined;
    this.posConfig.lastSyncAt = undefined;
    return this.save();
};
RestaurantSchema.methods.upgradeTier = function (newTier, newAmount) {
    this.subscription.tier = newTier;
    this.subscription.amount = newAmount;
    this.status = RestaurantStatus.ACTIVE;
    return this.save();
};
RestaurantSchema.methods.markOnboardingComplete = function () {
    this.onboardingCompletedAt = new Date();
    this.features.hasViewedDashboard = true;
    return this.save();
};
// Static methods
RestaurantSchema.statics.findByEmail = function (email) {
    return this.findOne({ 'owner.email': email.toLowerCase() });
};
RestaurantSchema.statics.findTrialExpiring = function (days = 3) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        status: RestaurantStatus.TRIAL,
        'subscription.trialEndsAt': { $lte: futureDate }
    });
};
RestaurantSchema.statics.findByPOSType = function (posType) {
    return this.find({ 'posConfig.type': posType });
};
// Export the model
exports.default = mongoose_1.default.model('Restaurant', RestaurantSchema);
