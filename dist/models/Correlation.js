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
exports.CorrelationStrength = exports.CorrelationType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Correlation Model
 * Stores discovered patterns between external factors and restaurant performance
 * Gets smarter with more data across all restaurants
 */
// Types of correlations we track
var CorrelationType;
(function (CorrelationType) {
    CorrelationType["WEATHER_SALES"] = "weather_sales";
    CorrelationType["WEATHER_TRAFFIC"] = "weather_traffic";
    CorrelationType["EVENT_SALES"] = "event_sales";
    CorrelationType["EVENT_TRAFFIC"] = "event_traffic";
    CorrelationType["EVENTS_TRAFFIC"] = "events_traffic";
    CorrelationType["HOLIDAY_SALES"] = "holiday_sales";
    CorrelationType["HOLIDAY_BEHAVIOR"] = "holiday_behavior";
    CorrelationType["DAY_TYPE"] = "day_type";
    CorrelationType["TEMPERATURE_ITEMS"] = "temperature_items";
    CorrelationType["WEATHER_MENU"] = "weather_menu";
    CorrelationType["SPORTS_SALES"] = "sports_sales";
    CorrelationType["MULTI_FACTOR"] = "multi_factor";
})(CorrelationType || (exports.CorrelationType = CorrelationType = {}));
// Correlation strength
var CorrelationStrength;
(function (CorrelationStrength) {
    CorrelationStrength["VERY_STRONG"] = "very_strong";
    CorrelationStrength["STRONG"] = "strong";
    CorrelationStrength["MODERATE"] = "moderate";
    CorrelationStrength["WEAK"] = "weak";
    CorrelationStrength["VERY_WEAK"] = "very_weak";
    CorrelationStrength["NONE"] = "none"; // < 0
})(CorrelationStrength || (exports.CorrelationStrength = CorrelationStrength = {}));
const CorrelationSchema = new mongoose_1.Schema({
    // Scope
    scope: {
        type: String,
        enum: ['global', 'regional', 'restaurant'],
        required: true,
        index: true
    },
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Restaurant',
        index: true
    },
    region: { type: String, index: true },
    cuisineType: { type: String, index: true },
    // Correlation type
    type: {
        type: String,
        enum: Object.values(CorrelationType),
        required: true,
        index: true
    },
    // External factor
    externalFactor: {
        type: {
            type: String,
            enum: ['weather', 'event', 'holiday', 'day_of_week', 'time_of_day'],
            required: true
        },
        temperature: { type: Number },
        weatherCondition: { type: String },
        precipitation: { type: Number },
        eventType: { type: String },
        eventDistance: { type: Number },
        eventAttendance: { type: Number },
        holidayName: { type: String },
        holidayType: { type: String },
        dayOfWeek: { type: String },
        hour: { type: Number },
        isWeekend: { type: Boolean }
    },
    // Business outcome
    businessOutcome: {
        metric: { type: String, required: true },
        value: { type: Number, required: true },
        change: { type: Number, required: true },
        baseline: { type: Number, required: true }
    },
    // Statistics
    statistics: {
        correlation: { type: Number, required: true, min: -1, max: 1 },
        pValue: { type: Number, required: true },
        sampleSize: { type: Number, required: true, min: 0 },
        confidence: { type: Number, required: true, min: 0, max: 100 },
        r_squared: { type: Number, required: true, min: 0, max: 1 }
    },
    // Pattern
    pattern: {
        description: { type: String, required: true },
        whenCondition: { type: String, required: true },
        thenOutcome: { type: String, required: true },
        strength: {
            type: String,
            enum: Object.values(CorrelationStrength),
            required: true
        },
        actionable: { type: Boolean, default: false },
        recommendation: { type: String }
    },
    // Learning metadata
    learning: {
        firstDiscovered: { type: Date, required: true, default: Date.now },
        lastUpdated: { type: Date, required: true, default: Date.now },
        dataPoints: { type: Number, required: true, min: 0 },
        restaurantsContributing: { type: Number, required: true, min: 0 },
        timesValidated: { type: Number, default: 0, min: 0 },
        timesInvalidated: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 }
    },
    // Application
    isActive: { type: Boolean, default: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    lastApplied: { type: Date },
    timesApplied: { type: Number, default: 0, min: 0 },
    // Versioning
    version: { type: Number, default: 1, min: 1 },
    previousVersionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Correlation' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for fast lookups
CorrelationSchema.index({ type: 1, scope: 1, isActive: 1 });
CorrelationSchema.index({ 'learning.accuracy': -1, confidence: -1 });
CorrelationSchema.index({ restaurantId: 1, type: 1 });
CorrelationSchema.index({ region: 1, cuisineType: 1, type: 1 });
// Virtual for reliability score
CorrelationSchema.virtual('reliabilityScore').get(function () {
    const accuracyWeight = 0.4;
    const sampleSizeWeight = 0.3;
    const correlationWeight = 0.3;
    const normalizedSampleSize = Math.min(this.learning.dataPoints / 1000, 1) * 100;
    const correlationScore = Math.abs(this.statistics.correlation) * 100;
    return (this.learning.accuracy * accuracyWeight +
        normalizedSampleSize * sampleSizeWeight +
        correlationScore * correlationWeight);
});
// Instance methods
CorrelationSchema.methods.updateValidation = function (wasCorrect) {
    if (wasCorrect) {
        this.learning.timesValidated++;
    }
    else {
        this.learning.timesInvalidated++;
    }
    // Update accuracy
    const total = this.learning.timesValidated + this.learning.timesInvalidated;
    this.learning.accuracy = (this.learning.timesValidated / total) * 100;
    // Update confidence based on accuracy and sample size
    this.confidence = Math.min(this.learning.accuracy * 0.7 +
        Math.min(total / 100, 1) * 30, 100);
    // Deactivate if accuracy drops below 40%
    if (this.learning.accuracy < 40 && total > 20) {
        this.isActive = false;
    }
    this.learning.lastUpdated = new Date();
    return this.save();
};
CorrelationSchema.methods.apply = function () {
    this.lastApplied = new Date();
    this.timesApplied++;
    return this.save();
};
CorrelationSchema.methods.createNewVersion = function (updates) {
    const newCorrelation = new this.constructor({
        ...this.toObject(),
        ...updates,
        _id: undefined,
        version: this.version + 1,
        previousVersionId: this._id,
        createdAt: undefined,
        updatedAt: undefined,
        learning: {
            ...this.learning,
            firstDiscovered: this.learning.firstDiscovered,
            lastUpdated: new Date()
        }
    });
    // Mark old version as inactive
    this.isActive = false;
    this.save();
    return newCorrelation.save();
};
// Static methods
CorrelationSchema.statics.findActivePatterns = function (type, scope, minConfidence = 60) {
    const query = {
        isActive: true,
        confidence: { $gte: minConfidence }
    };
    if (type)
        query.type = type;
    if (scope)
        query.scope = scope;
    return this.find(query)
        .sort({ confidence: -1, 'learning.accuracy': -1 })
        .limit(50);
};
CorrelationSchema.statics.findForRestaurant = function (restaurantId, region, cuisineType, type) {
    // Return patterns in order of specificity:
    // 1. Restaurant-specific patterns
    // 2. Regional + cuisine type patterns
    // 3. Regional patterns
    // 4. Cuisine type patterns
    // 5. Global patterns
    const queries = [
        { scope: 'restaurant', restaurantId: new mongoose_1.default.Types.ObjectId(restaurantId) },
        { scope: 'regional', region, cuisineType },
        { scope: 'regional', region },
        { scope: 'global', cuisineType },
        { scope: 'global' }
    ];
    if (type) {
        queries.forEach(q => q.type = type);
    }
    queries.forEach(q => {
        q.isActive = true;
        q.confidence = { $gte: 60 };
    });
    return Promise.all(queries.map(query => this.find(query).sort({ confidence: -1 }).limit(10))).then(results => {
        // Flatten and deduplicate by taking highest confidence version
        const seen = new Set();
        const merged = [];
        results.forEach(resultSet => {
            resultSet.forEach((correlation) => {
                const key = `${correlation.type}_${JSON.stringify(correlation.externalFactor)}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(correlation);
                }
            });
        });
        return merged.sort((a, b) => b.confidence - a.confidence);
    });
};
CorrelationSchema.statics.getMostReliable = function (limit = 20) {
    return this.aggregate([
        {
            $match: {
                isActive: true,
                'learning.dataPoints': { $gte: 30 } // Require minimum data
            }
        },
        {
            $addFields: {
                reliabilityScore: {
                    $add: [
                        { $multiply: ['$learning.accuracy', 0.4] },
                        { $multiply: [{ $min: [{ $divide: ['$learning.dataPoints', 1000] }, 1] }, 30] },
                        { $multiply: [{ $abs: '$statistics.correlation' }, 30] }
                    ]
                }
            }
        },
        { $sort: { reliabilityScore: -1 } },
        { $limit: limit }
    ]);
};
// Export model with proper typing
exports.default = mongoose_1.default.models.Correlation ||
    mongoose_1.default.model('Correlation', CorrelationSchema);
