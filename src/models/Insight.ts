import mongoose, { Document, Schema, Types } from 'mongoose';

// Enum for insight types
export enum InsightType {
  FREE_DISCOVERY = 'free_discovery',    // The free report that drives 65% conversion
  WEEKLY_SUMMARY = 'weekly_summary',    // Weekly performance insights
  MONTHLY_ANALYSIS = 'monthly_analysis', // Comprehensive monthly analysis
  REAL_TIME_ALERT = 'real_time_alert',  // Immediate alerts for urgent issues
  CUSTOM_REPORT = 'custom_report'       // User-requested custom analysis
}

// Enum for insight categories
export enum InsightCategory {
  REVENUE_OPTIMIZATION = 'revenue_optimization',
  EMPLOYEE_PERFORMANCE = 'employee_performance',
  CUSTOMER_EXPERIENCE = 'customer_experience',
  OPERATIONAL_EFFICIENCY = 'operational_efficiency',
  COST_REDUCTION = 'cost_reduction',
  PEAK_HOUR_ANALYSIS = 'peak_hour_analysis',
  MENU_OPTIMIZATION = 'menu_optimization',
  UPSELLING_OPPORTUNITIES = 'upselling_opportunities'
}

// Enum for insight priority levels
export enum InsightPriority {
  CRITICAL = 'critical',     // Immediate action required
  HIGH = 'high',            // Should address within 48 hours
  MEDIUM = 'medium',        // Address within a week
  LOW = 'low'              // Nice to have improvements
}

// Enum for insight status
export enum InsightStatus {
  DRAFT = 'draft',
  GENERATED = 'generated',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACTED_UPON = 'acted_upon',
  DISMISSED = 'dismissed'
}

// Interface for data sources used in analysis
export interface IDataSource {
  transactions: {
    startDate: Date;
    endDate: Date;
    totalCount: number;
    totalRevenue: number;
  };
  employees?: {
    activeCount: number;
    performanceMetrics: boolean;
  };
  customers?: {
    uniqueCount: number;
    repeatCustomerRate: number;
  };
  menuItems?: {
    totalItems: number;
    topSellers: string[];
  };
}

// Interface for key findings
export interface IKeyFinding {
  category: InsightCategory;
  title: string;
  description: string;
  impact: {
    type: 'revenue' | 'cost' | 'efficiency' | 'satisfaction';
    value: number;           // Dollar amount or percentage
    unit: '$' | '%' | 'minutes' | 'orders';
    timeframe: 'daily' | 'weekly' | 'monthly' | 'annually';
  };
  evidence: {
    dataPoints: Array<{
      metric: string;
      value: number;
      benchmark?: number;
      industry_average?: number;
    }>;
    trends: Array<{
      period: string;
      value: number;
      change: number;       // Percentage change
    }>;
  };
  confidenceScore: number; // 0-100, AI confidence in this finding
  priority: InsightPriority;
}

// Interface for actionable recommendations
export interface IRecommendation {
  id: string;              // Unique identifier for tracking
  title: string;
  description: string;
  category: InsightCategory;
  priority: InsightPriority;
  
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: string;  // e.g., "15 minutes", "2 hours", "1 week"
    cost: number;         // Implementation cost
    roi: {
      timeframe: string;  // e.g., "30 days", "3 months"
      expectedReturn: number;
      probability: number; // 0-100, likelihood of achieving ROI
    };
  };
  
  steps: Array<{
    stepNumber: number;
    description: string;
    estimatedTime: string;
  }>;
  
  metrics: {
    kpis: string[];       // KPIs to track success
    trackingMethod: string;
    expectedImprovement: string;
  };
  
  status: 'suggested' | 'in_progress' | 'completed' | 'dismissed';
  implementedAt?: Date;
  dismissedAt?: Date;
  dismissalReason?: string;
}

// Interface for benchmark comparisons
export interface IBenchmark {
  metric: string;
  restaurantValue: number;
  industryAverage: number;
  topPerformerValue: number;
  percentileRank: number;   // Where restaurant ranks (0-100)
  unit: string;
}

// Main Insight interface
export interface IInsight extends Document {
  // Basic information
  restaurantId: Types.ObjectId;
  type: InsightType;
  title: string;
  summary: string;           // Executive summary for quick reading
  
  // Analysis period and data
  analysisStartDate: Date;
  analysisEndDate: Date;
  dataSource: IDataSource;
  
  // Key insights and findings
  keyFindings: IKeyFinding[];
  recommendations: IRecommendation[];
  benchmarks: IBenchmark[];
  
  // Lost revenue calculation (especially important for discovery reports)
  lostRevenue: {
    total: number;          // Total lost revenue found
    breakdown: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
    methodology: string;    // How we calculated this
    confidenceLevel: number; // 0-100
  };
  
  // AI-generated content
  aiAnalysis: {
    model: string;          // e.g., "claude-3.7-sonnet"
    promptVersion: string;  // For tracking prompt iterations
    rawResponse: string;    // Full AI response for debugging
    processingTime: number; // Milliseconds
    tokensUsed: number;
  };
  
  // Status and engagement
  status: InsightStatus;
  priority: InsightPriority;
  
  // Engagement tracking
  engagement: {
    emailOpened: boolean;
    emailOpenedAt?: Date;
    reportViewed: boolean;
    reportViewedAt?: Date;
    timeSpentViewing?: number; // Seconds
    recommendationsViewed: string[]; // Array of recommendation IDs
    recommendationsImplemented: string[];
    shareCount: number;
    exportCount: number;
  };
  
  // Metadata
  generatedBy: string;      // 'system' or user ID
  generatedAt: Date;
  sentAt?: Date;
  expiresAt?: Date;         // For time-sensitive insights
  
  // Version control for iterative improvements
  version: number;
  previousVersionId?: Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsViewed(viewingTime?: number): Promise<this>;
  markRecommendationImplemented(recommendationId: string): Promise<this>;
  sendToRestaurant(): Promise<this>;
  createNewVersion(updates: Partial<IInsight>): Promise<IInsight>;
}

// Mongoose schema definition
const InsightSchema = new Schema<IInsight>({
  restaurantId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Restaurant', 
    required: true,
    index: true
  },
  
  type: { 
    type: String, 
    enum: Object.values(InsightType),
    required: true 
  },
  
  title: { type: String, required: true, trim: true },
  summary: { type: String, required: true },
  
  // Analysis period
  analysisStartDate: { type: Date, required: true },
  analysisEndDate: { type: Date, required: true },
  
  // Data source information
  dataSource: {
    transactions: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      totalCount: { type: Number, required: true, min: 0 },
      totalRevenue: { type: Number, required: true, min: 0 }
    },
    employees: {
      activeCount: { type: Number, min: 0 },
      performanceMetrics: { type: Boolean, default: false }
    },
    customers: {
      uniqueCount: { type: Number, min: 0 },
      repeatCustomerRate: { type: Number, min: 0, max: 100 }
    },
    menuItems: {
      totalItems: { type: Number, min: 0 },
      topSellers: [{ type: String }]
    }
  },
  
  // Key findings array
  keyFindings: [{
    category: { 
      type: String, 
      enum: Object.values(InsightCategory),
      required: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    impact: {
      type: { 
        type: String, 
        enum: ['revenue', 'cost', 'efficiency', 'satisfaction'],
        required: true 
      },
      value: { type: Number, required: true },
      unit: { 
        type: String, 
        enum: ['$', '%', 'minutes', 'orders'],
        required: true 
      },
      timeframe: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly', 'annually'],
        required: true 
      }
    },
    evidence: {
      dataPoints: [{
        metric: { type: String, required: true },
        value: { type: Number, required: true },
        benchmark: { type: Number },
        industry_average: { type: Number }
      }],
      trends: [{
        period: { type: String, required: true },
        value: { type: Number, required: true },
        change: { type: Number, required: true }
      }]
    },
    confidenceScore: { type: Number, min: 0, max: 100, required: true },
    priority: { 
      type: String, 
      enum: Object.values(InsightPriority),
      required: true 
    }
  }],
  
  // Recommendations array
  recommendations: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: Object.values(InsightCategory),
      required: true 
    },
    priority: { 
      type: String, 
      enum: Object.values(InsightPriority),
      required: true 
    },
    
    implementation: {
      difficulty: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'],
        required: true 
      },
      timeRequired: { type: String, required: true },
      cost: { type: Number, min: 0, required: true },
      roi: {
        timeframe: { type: String, required: true },
        expectedReturn: { type: Number, required: true },
        probability: { type: Number, min: 0, max: 100, required: true }
      }
    },
    
    steps: [{
      stepNumber: { type: Number, required: true },
      description: { type: String, required: true },
      estimatedTime: { type: String, required: true }
    }],
    
    metrics: {
      kpis: [{ type: String }],
      trackingMethod: { type: String, required: true },
      expectedImprovement: { type: String, required: true }
    },
    
    status: { 
      type: String, 
      enum: ['suggested', 'in_progress', 'completed', 'dismissed'],
      default: 'suggested'
    },
    implementedAt: { type: Date },
    dismissedAt: { type: Date },
    dismissalReason: { type: String }
  }],
  
  // Industry benchmarks
  benchmarks: [{
    metric: { type: String, required: true },
    restaurantValue: { type: Number, required: true },
    industryAverage: { type: Number, required: true },
    topPerformerValue: { type: Number, required: true },
    percentileRank: { type: Number, min: 0, max: 100, required: true },
    unit: { type: String, required: true }
  }],
  
  // Lost revenue analysis
  lostRevenue: {
    total: { type: Number, required: true, min: 0 },
    breakdown: [{
      category: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 },
      description: { type: String, required: true }
    }],
    methodology: { type: String, required: true },
    confidenceLevel: { type: Number, min: 0, max: 100, required: true }
  },
  
  // AI generation metadata
  aiAnalysis: {
    model: { type: String, required: true },
    promptVersion: { type: String, required: true },
    rawResponse: { type: String, required: true },
    processingTime: { type: Number, required: true },
    tokensUsed: { type: Number, required: true }
  },
  
  // Status and priority
  status: { 
    type: String, 
    enum: Object.values(InsightStatus),
    default: InsightStatus.DRAFT
  },
  priority: { 
    type: String, 
    enum: Object.values(InsightPriority),
    required: true 
  },
  
  // Engagement tracking
  engagement: {
    emailOpened: { type: Boolean, default: false },
    emailOpenedAt: { type: Date },
    reportViewed: { type: Boolean, default: false },
    reportViewedAt: { type: Date },
    timeSpentViewing: { type: Number, min: 0 },
    recommendationsViewed: [{ type: String }],
    recommendationsImplemented: [{ type: String }],
    shareCount: { type: Number, default: 0, min: 0 },
    exportCount: { type: Number, default: 0, min: 0 }
  },
  
  // Generation metadata
  generatedBy: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  expiresAt: { type: Date },
  
  // Versioning
  version: { type: Number, default: 1, min: 1 },
  previousVersionId: { type: Schema.Types.ObjectId, ref: 'Insight' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InsightSchema.index({ restaurantId: 1, type: 1 });
InsightSchema.index({ restaurantId: 1, createdAt: -1 });
InsightSchema.index({ status: 1 });
InsightSchema.index({ type: 1, generatedAt: -1 });
InsightSchema.index({ 'engagement.reportViewed': 1 });
InsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for calculating days since generated
InsightSchema.virtual('daysSinceGenerated').get(function(this: IInsight) {
  const now = new Date();
  const diffTime = now.getTime() - this.generatedAt.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for checking if insight is actionable (has high-priority recommendations)
InsightSchema.virtual('hasActionableRecommendations').get(function(this: IInsight) {
  return this.recommendations.some(rec => 
    rec.priority === InsightPriority.CRITICAL || rec.priority === InsightPriority.HIGH
  );
});

// Virtual for total potential revenue recovery
InsightSchema.virtual('totalPotentialRecovery').get(function(this: IInsight) {
  return this.recommendations.reduce((total, rec) => {
    return total + (rec.implementation.roi.expectedReturn * rec.implementation.roi.probability / 100);
  }, 0);
});

// Pre-save middleware to validate dates
InsightSchema.pre('save', function(this: IInsight, next) {
  if (this.analysisEndDate <= this.analysisStartDate) {
    return next(new Error('Analysis end date must be after start date'));
  }
  
  if (this.expiresAt && this.expiresAt <= new Date()) {
    return next(new Error('Expiration date must be in the future'));
  }
  
  next();
});

// Instance methods
InsightSchema.methods.markAsViewed = function(this: IInsight, viewingTime?: number) {
  this.engagement.reportViewed = true;
  this.engagement.reportViewedAt = new Date();
  if (viewingTime) {
    this.engagement.timeSpentViewing = (this.engagement.timeSpentViewing || 0) + viewingTime;
  }
  this.status = InsightStatus.VIEWED;
  return this.save();
};

InsightSchema.methods.markRecommendationImplemented = function(this: IInsight, recommendationId: string) {
  if (!this.engagement.recommendationsImplemented.includes(recommendationId)) {
    this.engagement.recommendationsImplemented.push(recommendationId);
  }
  
  // Update recommendation status
  const recommendation = this.recommendations.find(rec => rec.id === recommendationId);
  if (recommendation) {
    recommendation.status = 'completed';
    recommendation.implementedAt = new Date();
  }
  
  this.status = InsightStatus.ACTED_UPON;
  return this.save();
};

InsightSchema.methods.sendToRestaurant = function(this: IInsight) {
  this.status = InsightStatus.SENT;
  this.sentAt = new Date();
  return this.save();
};

InsightSchema.methods.createNewVersion = function(this: IInsight, updates: Partial<IInsight>) {
  const newInsight = new (this.constructor as any)({
    ...this.toObject(),
    ...updates,
    _id: undefined,
    version: this.version + 1,
    previousVersionId: this._id,
    createdAt: undefined,
    updatedAt: undefined,
    status: InsightStatus.DRAFT,
    engagement: {
      emailOpened: false,
      reportViewed: false,
      recommendationsViewed: [],
      recommendationsImplemented: [],
      shareCount: 0,
      exportCount: 0
    }
  });
  
  return newInsight.save();
};

// Static methods
InsightSchema.statics.findByRestaurant = function(restaurantId: string, type?: InsightType) {
  const query: any = { restaurantId };
  if (type) query.type = type;
  return this.find(query).sort({ createdAt: -1 });
};

InsightSchema.statics.findPendingDelivery = function() {
  return this.find({
    status: InsightStatus.GENERATED,
    sentAt: { $exists: false }
  });
};

InsightSchema.statics.findExpiring = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiresAt: { $lte: futureDate, $gt: new Date() },
    status: { $in: [InsightStatus.SENT, InsightStatus.VIEWED] }
  });
};

InsightSchema.statics.getEngagementStats = function(restaurantId?: string) {
  const match: any = {};
  if (restaurantId) match.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        totalGenerated: { $sum: 1 },
        totalViewed: { $sum: { $cond: ['$engagement.reportViewed', 1, 0] } },
        avgViewingTime: { $avg: '$engagement.timeSpentViewing' },
        totalRecommendationsImplemented: { 
          $sum: { $size: '$engagement.recommendationsImplemented' } 
        }
      }
    }
  ]);
};

// Export the model (handle Next.js hot reload in dev mode)
export default (mongoose.models.Insight as mongoose.Model<IInsight>) ||
  mongoose.model<IInsight>('Insight', InsightSchema);