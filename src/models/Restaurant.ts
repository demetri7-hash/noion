import mongoose, { Document, Schema } from 'mongoose';

// Enum for restaurant types
export enum RestaurantType {
  QUICK_SERVICE = 'quick_service',
  CASUAL_DINING = 'casual_dining',
  FINE_DINING = 'fine_dining',
  FAST_CASUAL = 'fast_casual',
  CAFE = 'cafe',
  BAR = 'bar',
  FOOD_TRUCK = 'food_truck',
  OTHER = 'other'
}

// Enum for POS system types
export enum POSSystemType {
  TOAST = 'toast',
  SQUARE = 'square',
  CLOVER = 'clover',
  REVEL = 'revel',
  LIGHTSPEED = 'lightspeed',
  SHOPKEEP = 'shopkeep',
  OTHER = 'other'
}

// Enum for subscription tiers
export enum SubscriptionTier {
  PULSE = 'pulse',           // $29-99/month - Basic insights, lead generation
  INTELLIGENCE = 'intelligence', // $299-799/month - Core product, comprehensive analytics
  COMMAND = 'command'        // $2,500-10K/month - Enterprise multi-location
}

// Enum for restaurant status
export enum RestaurantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CHURNED = 'churned',
  PENDING_SETUP = 'pending_setup'
}

// Enum for user roles (Employee Management System)
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

// Interface for owner information
export interface IOwnerInfo {
  userId?: string;                // User ID (for multi-user support)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title?: string;
  password: string;
  role?: UserRole | string; // Support both new enum and legacy string
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;

  // Employee Management System fields
  employeeId?: string;           // For non-owner users
  hireDate?: Date;                // Employment start date
  isActive?: boolean;             // Active/inactive status

  // Gamification fields
  points?: number;                // Total points earned
  level?: number;                 // Current level (1-10)
  streak?: number;                // Current streak (days)
  lastActivityDate?: Date;        // Last activity for streak tracking

  // Permissions cache (for performance)
  cachedPermissions?: string[];   // Cached from Casbin
  permissionsCachedAt?: Date;     // When permissions were last cached
}

// Interface for restaurant location
export interface ILocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Interface for POS system configuration
export interface IPOSConfig {
  type: POSSystemType;
  isConnected: boolean;
  clientId?: string;                  // Encrypted Client ID
  encryptedAccessToken?: string;      // Encrypted for security
  encryptedRefreshToken?: string;     // Encrypted for security
  encryptedClientSecret?: string;     // Encrypted Client Secret
  lastSyncAt?: Date;                  // When data was last synced
  syncInterval?: 'manual' | 'on_login' | 'hourly' | 'daily';  // Auto-sync strategy
  isActive?: boolean;                 // Is POS connection active?
  webhookUrl?: string;
  webhookSecret?: string;
  locationId?: string;                // For multi-location POS systems (Toast GUID)
  managementGroupId?: string;         // For Toast specifically
}

// Interface for subscription information
export interface ISubscription {
  plan: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  startDate: Date;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  nextBillingDate?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date;
}

// Interface for billing information
export interface IBilling {
  stripeCustomerId?: string;
  paymentHistory?: Array<{
    invoiceId: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending';
    paidAt: Date;
  }>;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  paymentMethodId?: string;
}

// Interface for analytics settings
export interface IAnalyticsSettings {
  timezone: string;
  businessHours: {
    monday: { open: string; close: string; closed?: boolean };
    tuesday: { open: string; close: string; closed?: boolean };
    wednesday: { open: string; close: string; closed?: boolean };
    thursday: { open: string; close: string; closed?: boolean };
    friday: { open: string; close: string; closed?: boolean };
    saturday: { open: string; close: string; closed?: boolean };
    sunday: { open: string; close: string; closed?: boolean };
  };
  averageTicketGoal?: number;
  revenueGoal?: number;
  laborCostPercentageGoal?: number;
  enableEmailReports: boolean;
  reportFrequency: 'daily' | 'weekly' | 'monthly';
}

// Interface for imported employee data
export interface IEmployee {
  _id?: any;                          // Mongoose subdocument ID
  userId: string;                     // User ID (email or generated)
  toastEmployeeId?: string;           // Toast employee GUID
  email?: string;                     // Employee email
  firstName: string;                  // First name
  lastName: string;                   // Last name
  role: UserRole | string;            // Employee role
  phone?: string;                     // Phone number
  isActive: boolean;                  // Active status

  // Gamification fields
  points: number;                     // Total points earned
  level: number;                      // Current level (1-10)
  streak: number;                     // Current streak (days)
  badges?: string[];                  // Earned badges

  // Toast-specific data
  toastData?: {
    externalId?: string;
    chosenName?: string;
    jobTitle?: string;
    wage?: number;
    createdDate?: string;
    modifiedDate?: string;
  };

  // Metadata
  importedAt?: Date;                  // When imported
  importedFrom?: string;              // Source system (e.g., 'toast')
}

// Interface for team/employee management
export interface ITeam {
  employees?: IEmployee[];            // Array of imported employees
}

// Main Restaurant interface
export interface IRestaurant extends Document {
  // Owner information
  owner: IOwnerInfo;
  
  // Restaurant details
  name: string;
  type: RestaurantType;
  location: ILocation;
  website?: string;
  phoneNumber?: string;
  
  // POS system integration
  posConfig: IPOSConfig;
  
  // Subscription and billing
  subscription: ISubscription;
  billing?: IBilling;
  
  // Status and settings
  status: RestaurantStatus;
  analyticsSettings: IAnalyticsSettings;

  // Team and employee management
  team?: ITeam;

  // Feature flags
  features: {
    discoveryReportSent: boolean;
    hasViewedDashboard: boolean;
    hasGeneratedReport: boolean;
    enableVideoAnalytics: boolean;      // Future feature
    enableAudioAnalytics: boolean;      // Future feature
    enablePredictiveAnalytics: boolean; // Future feature
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  onboardingCompletedAt?: Date;
  
  // Computed fields (virtuals)
  isTrialExpired: boolean;
  daysUntilTrialExpires: number;
  monthlyRevenue?: number;            // Calculated from transactions
  employeeCount?: number;             // Calculated from POS data
}

// Mongoose schema definition
const RestaurantSchema = new Schema<IRestaurant>({
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
    role: {
      type: String,
      enum: [...Object.values(UserRole), 'restaurant_owner', 'restaurant_manager', 'restaurant_staff'], // Support legacy and new roles
      default: UserRole.OWNER
    },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    lastLoginAt: { type: Date },

    // Employee Management System fields
    employeeId: { type: String },
    hireDate: { type: Date },
    isActive: { type: Boolean, default: true },

    // Gamification fields
    points: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1, max: 10 },
    streak: { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date },

    // Permissions cache
    cachedPermissions: [{ type: String }],
    permissionsCachedAt: { type: Date }
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
    encryptedClientSecret: { type: String },
    lastSyncAt: { type: Date },
    syncInterval: {
      type: String,
      enum: ['manual', 'on_login', 'hourly', 'daily'],
      default: 'on_login'
    },
    isActive: { type: Boolean, default: false },
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

  // Team and employee management
  team: {
    employees: [{
      userId: { type: String, required: true },
      toastEmployeeId: { type: String },
      email: { type: String },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      role: {
        type: String,
        enum: [...Object.values(UserRole), 'restaurant_owner', 'restaurant_manager', 'restaurant_staff'],
        default: UserRole.EMPLOYEE
      },
      phone: { type: String },
      isActive: { type: Boolean, default: true },

      // Gamification fields
      points: { type: Number, default: 0, min: 0 },
      level: { type: Number, default: 1, min: 1, max: 10 },
      streak: { type: Number, default: 0, min: 0 },
      badges: [{ type: String }],

      // Toast-specific data
      toastData: {
        externalId: { type: String },
        chosenName: { type: String },
        jobTitle: { type: String },
        wage: { type: Number },
        createdDate: { type: String },
        modifiedDate: { type: String }
      },

      // Metadata
      importedAt: { type: Date },
      importedFrom: { type: String }
    }]
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
RestaurantSchema.virtual('isTrialExpired').get(function(this: IRestaurant) {
  if (this.status !== RestaurantStatus.TRIAL) return false;
  return this.subscription.trialEndsAt ? new Date() > this.subscription.trialEndsAt : false;
});

// Virtual for days until trial expires
RestaurantSchema.virtual('daysUntilTrialExpires').get(function(this: IRestaurant) {
  if (this.status !== RestaurantStatus.TRIAL || !this.subscription.trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = this.subscription.trialEndsAt;
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Pre-save middleware to validate business hours format
RestaurantSchema.pre('save', function(this: IRestaurant, next) {
  // Validate business hours format (HH:MM)
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  for (const day of Object.keys(this.analyticsSettings.businessHours)) {
    const hours = this.analyticsSettings.businessHours[day as keyof typeof this.analyticsSettings.businessHours];
    if (!hours.closed && hours.open && hours.close) {
      if (!timePattern.test(hours.open) || !timePattern.test(hours.close)) {
        return next(new Error(`Invalid time format for ${day}. Use HH:MM format.`));
      }
    }
  }
  
  next();
});

// Instance methods
RestaurantSchema.methods.connectPOS = function(this: IRestaurant, posType: POSSystemType, credentials: any) {
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

RestaurantSchema.methods.disconnectPOS = function(this: IRestaurant) {
  this.posConfig.isConnected = false;
  this.posConfig.encryptedAccessToken = undefined;
  this.posConfig.encryptedRefreshToken = undefined;
  this.posConfig.lastSyncAt = undefined;
  
  return this.save();
};

RestaurantSchema.methods.upgradeTier = function(this: IRestaurant, newTier: SubscriptionTier, newAmount: number) {
  this.subscription.tier = newTier;
  this.subscription.amount = newAmount;
  this.status = RestaurantStatus.ACTIVE;
  
  return this.save();
};

RestaurantSchema.methods.markOnboardingComplete = function(this: IRestaurant) {
  this.onboardingCompletedAt = new Date();
  this.features.hasViewedDashboard = true;
  
  return this.save();
};

// Static methods
RestaurantSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ 'owner.email': email.toLowerCase() });
};

RestaurantSchema.statics.findTrialExpiring = function(days: number = 3) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: RestaurantStatus.TRIAL,
    'subscription.trialEndsAt': { $lte: futureDate }
  });
};

RestaurantSchema.statics.findByPOSType = function(posType: POSSystemType) {
  return this.find({ 'posConfig.type': posType });
};

// Export the model (handle Next.js hot reload in dev mode)
export default (mongoose.models.Restaurant as mongoose.Model<IRestaurant>) ||
  mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);