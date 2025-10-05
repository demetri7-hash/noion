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
exports.InsightStatus = exports.InsightPriority = exports.InsightCategory = exports.InsightType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum for insight types
var InsightType;
(function (InsightType) {
    InsightType["FREE_DISCOVERY"] = "free_discovery";
    InsightType["WEEKLY_SUMMARY"] = "weekly_summary";
    InsightType["MONTHLY_ANALYSIS"] = "monthly_analysis";
    InsightType["REAL_TIME_ALERT"] = "real_time_alert";
    InsightType["CUSTOM_REPORT"] = "custom_report"; // User-requested custom analysis
})(InsightType || (exports.InsightType = InsightType = {}));
// Enum for insight categories
var InsightCategory;
(function (InsightCategory) {
    InsightCategory["REVENUE_OPTIMIZATION"] = "revenue_optimization";
    InsightCategory["EMPLOYEE_PERFORMANCE"] = "employee_performance";
    InsightCategory["CUSTOMER_EXPERIENCE"] = "customer_experience";
    InsightCategory["OPERATIONAL_EFFICIENCY"] = "operational_efficiency";
    InsightCategory["COST_REDUCTION"] = "cost_reduction";
    InsightCategory["PEAK_HOUR_ANALYSIS"] = "peak_hour_analysis";
    InsightCategory["MENU_OPTIMIZATION"] = "menu_optimization";
    InsightCategory["UPSELLING_OPPORTUNITIES"] = "upselling_opportunities";
})(InsightCategory || (exports.InsightCategory = InsightCategory = {}));
// Enum for insight priority levels
var InsightPriority;
(function (InsightPriority) {
    InsightPriority["CRITICAL"] = "critical";
    InsightPriority["HIGH"] = "high";
    InsightPriority["MEDIUM"] = "medium";
    InsightPriority["LOW"] = "low"; // Nice to have improvements
})(InsightPriority || (exports.InsightPriority = InsightPriority = {}));
// Enum for insight status
var InsightStatus;
(function (InsightStatus) {
    InsightStatus["DRAFT"] = "draft";
    InsightStatus["GENERATED"] = "generated";
    InsightStatus["SENT"] = "sent";
    InsightStatus["VIEWED"] = "viewed";
    InsightStatus["ACTED_UPON"] = "acted_upon";
    InsightStatus["DISMISSED"] = "dismissed";
})(InsightStatus || (exports.InsightStatus = InsightStatus = {}));
// Mongoose schema definition
const InsightSchema = new mongoose_1.Schema({
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    previousVersionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Insight' }
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
InsightSchema.virtual('daysSinceGenerated').get(function () {
    const now = new Date();
    const diffTime = now.getTime() - this.generatedAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for checking if insight is actionable (has high-priority recommendations)
InsightSchema.virtual('hasActionableRecommendations').get(function () {
    return this.recommendations.some(rec => rec.priority === InsightPriority.CRITICAL || rec.priority === InsightPriority.HIGH);
});
// Virtual for total potential revenue recovery
InsightSchema.virtual('totalPotentialRecovery').get(function () {
    return this.recommendations.reduce((total, rec) => {
        return total + (rec.implementation.roi.expectedReturn * rec.implementation.roi.probability / 100);
    }, 0);
});
// Pre-save middleware to validate dates
InsightSchema.pre('save', function (next) {
    if (this.analysisEndDate <= this.analysisStartDate) {
        return next(new Error('Analysis end date must be after start date'));
    }
    if (this.expiresAt && this.expiresAt <= new Date()) {
        return next(new Error('Expiration date must be in the future'));
    }
    next();
});
// Instance methods
InsightSchema.methods.markAsViewed = function (viewingTime) {
    this.engagement.reportViewed = true;
    this.engagement.reportViewedAt = new Date();
    if (viewingTime) {
        this.engagement.timeSpentViewing = (this.engagement.timeSpentViewing || 0) + viewingTime;
    }
    this.status = InsightStatus.VIEWED;
    return this.save();
};
InsightSchema.methods.markRecommendationImplemented = function (recommendationId) {
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
InsightSchema.methods.sendToRestaurant = function () {
    this.status = InsightStatus.SENT;
    this.sentAt = new Date();
    return this.save();
};
InsightSchema.methods.createNewVersion = function (updates) {
    const newInsight = new this.constructor({
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
InsightSchema.statics.findByRestaurant = function (restaurantId, type) {
    const query = { restaurantId };
    if (type)
        query.type = type;
    return this.find(query).sort({ createdAt: -1 });
};
InsightSchema.statics.findPendingDelivery = function () {
    return this.find({
        status: InsightStatus.GENERATED,
        sentAt: { $exists: false }
    });
};
InsightSchema.statics.findExpiring = function (days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        expiresAt: { $lte: futureDate, $gt: new Date() },
        status: { $in: [InsightStatus.SENT, InsightStatus.VIEWED] }
    });
};
InsightSchema.statics.getEngagementStats = function (restaurantId) {
    const match = {};
    if (restaurantId)
        match.restaurantId = new mongoose_1.default.Types.ObjectId(restaurantId);
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
exports.default = mongoose_1.default.models.Insight ||
    mongoose_1.default.model('Insight', InsightSchema);
