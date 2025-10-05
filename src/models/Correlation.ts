import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Correlation Model
 * Stores discovered patterns between external factors and restaurant performance
 * Gets smarter with more data across all restaurants
 */

// Types of correlations we track
export enum CorrelationType {
  WEATHER_SALES = 'weather_sales',
  WEATHER_TRAFFIC = 'weather_traffic',
  EVENT_SALES = 'event_sales',
  EVENT_TRAFFIC = 'event_traffic',
  EVENTS_TRAFFIC = 'events_traffic', // Alias for EVENT_TRAFFIC
  HOLIDAY_SALES = 'holiday_sales',
  HOLIDAY_BEHAVIOR = 'holiday_behavior',
  DAY_TYPE = 'day_type',
  TEMPERATURE_ITEMS = 'temperature_items',
  WEATHER_MENU = 'weather_menu',
  SPORTS_SALES = 'sports_sales',
  MULTI_FACTOR = 'multi_factor'
}

// Correlation strength
export enum CorrelationStrength {
  VERY_STRONG = 'very_strong', // 0.8 - 1.0
  STRONG = 'strong',           // 0.6 - 0.8
  MODERATE = 'moderate',       // 0.4 - 0.6
  WEAK = 'weak',              // 0.2 - 0.4
  VERY_WEAK = 'very_weak',    // 0.0 - 0.2
  NONE = 'none'               // < 0
}

// External factor that influences behavior
export interface IExternalFactor {
  type: 'weather' | 'event' | 'holiday' | 'day_of_week' | 'time_of_day' | 'sports' | 'multi_factor';

  // Weather factors
  temperature?: number;
  weatherCondition?: string;
  precipitation?: number;
  weatherCategory?: string;

  // Event factors
  eventType?: string;
  eventDistance?: number;
  eventAttendance?: number;
  venueName?: string;
  expectedAttendance?: number;

  // Holiday factors
  holidayName?: string;
  holidayType?: string;

  // Time factors
  dayOfWeek?: string;
  hour?: number;
  isWeekend?: boolean;

  // Sports factors
  league?: string;
  teamName?: string;
  isGameDay?: boolean;

  // Menu item factors
  menuItem?: string;
  menuCategory?: string;

  // Multi-factor patterns
  factors?: string[];
  description?: string;
}

// Business outcome affected
export interface IBusinessOutcome {
  metric: string; // 'revenue', 'traffic', 'avg_ticket', 'item_sales', etc.
  value: number;
  change: number; // Percentage change from baseline
  baseline: number; // What's normal
}

// Statistical significance
export interface IStatistics {
  correlation: number; // -1 to 1
  pValue: number; // Statistical significance
  sampleSize: number; // Number of data points
  confidence: number; // 0-100%
  r_squared: number; // Coefficient of determination
}

// Pattern that was discovered
export interface IPattern {
  description: string;
  whenCondition: string; // "When temperature is above 80°F"
  thenOutcome: string;   // "Revenue increases by 15%"
  strength: CorrelationStrength;
  actionable: boolean;
  recommendation?: string;
}

// Main Correlation interface
export interface ICorrelation extends Document {
  // Scope
  scope: 'global' | 'regional' | 'restaurant';
  restaurantId?: Types.ObjectId; // Null for global patterns
  region?: string; // 'northeast', 'southwest', etc.
  cuisineType?: string; // Restaurant type for targeted correlations

  // Correlation details
  type: CorrelationType;
  externalFactor: IExternalFactor;
  businessOutcome: IBusinessOutcome;

  // Statistical analysis
  statistics: IStatistics;

  // Pattern discovered
  pattern: IPattern;

  // Learning metadata
  learning: {
    firstDiscovered: Date;
    lastUpdated: Date;
    dataPoints: number; // Total data points analyzed
    restaurantsContributing: number; // How many restaurants this pattern is based on
    timesValidated: number; // How many times pattern held true
    timesInvalidated: number; // How many times it didn't
    accuracy: number; // Percentage accuracy
  };

  // Application
  isActive: boolean; // Is this pattern being used in predictions?
  confidence: number; // 0-100, overall confidence in this pattern
  lastApplied?: Date;
  timesApplied: number;

  // Version for pattern evolution
  version: number;
  previousVersionId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// Model interface with static methods
export interface ICorrelationModel extends mongoose.Model<ICorrelation> {
  findActivePatterns(
    type?: CorrelationType,
    scope?: string,
    minConfidence?: number
  ): Promise<ICorrelation[]>;

  findForRestaurant(
    restaurantId: string,
    region: string,
    cuisineType: string,
    type?: CorrelationType
  ): Promise<ICorrelation[]>;

  getMostReliable(limit?: number): Promise<ICorrelation[]>;
}

const CorrelationSchema = new Schema<ICorrelation>({
  // Scope
  scope: {
    type: String,
    enum: ['global', 'regional', 'restaurant'],
    required: true,
    index: true
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
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
  previousVersionId: { type: Schema.Types.ObjectId, ref: 'Correlation' }
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
CorrelationSchema.virtual('reliabilityScore').get(function(this: ICorrelation) {
  const accuracyWeight = 0.4;
  const sampleSizeWeight = 0.3;
  const correlationWeight = 0.3;

  const normalizedSampleSize = Math.min(this.learning.dataPoints / 1000, 1) * 100;
  const correlationScore = Math.abs(this.statistics.correlation) * 100;

  return (
    this.learning.accuracy * accuracyWeight +
    normalizedSampleSize * sampleSizeWeight +
    correlationScore * correlationWeight
  );
});

// Instance methods
CorrelationSchema.methods.updateValidation = function(this: ICorrelation, wasCorrect: boolean) {
  if (wasCorrect) {
    this.learning.timesValidated++;
  } else {
    this.learning.timesInvalidated++;
  }

  // Update accuracy
  const total = this.learning.timesValidated + this.learning.timesInvalidated;
  this.learning.accuracy = (this.learning.timesValidated / total) * 100;

  // Update confidence based on accuracy and sample size
  this.confidence = Math.min(
    this.learning.accuracy * 0.7 +
    Math.min(total / 100, 1) * 30,
    100
  );

  // Deactivate if accuracy drops below 40%
  if (this.learning.accuracy < 40 && total > 20) {
    this.isActive = false;
  }

  this.learning.lastUpdated = new Date();
  return this.save();
};

CorrelationSchema.methods.apply = function(this: ICorrelation) {
  this.lastApplied = new Date();
  this.timesApplied++;
  return this.save();
};

CorrelationSchema.methods.createNewVersion = function(this: ICorrelation, updates: Partial<ICorrelation>) {
  const newCorrelation = new (this.constructor as any)({
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
CorrelationSchema.statics.findActivePatterns = function(
  type?: CorrelationType,
  scope?: string,
  minConfidence: number = 60
) {
  const query: any = {
    isActive: true,
    confidence: { $gte: minConfidence }
  };

  if (type) query.type = type;
  if (scope) query.scope = scope;

  return this.find(query)
    .sort({ confidence: -1, 'learning.accuracy': -1 })
    .limit(50);
};

CorrelationSchema.statics.findForRestaurant = function(
  restaurantId: string,
  region: string,
  cuisineType: string,
  type?: CorrelationType
) {
  // Return patterns in order of specificity:
  // 1. Restaurant-specific patterns
  // 2. Regional + cuisine type patterns
  // 3. Regional patterns
  // 4. Cuisine type patterns
  // 5. Global patterns

  const queries = [
    { scope: 'restaurant', restaurantId: new mongoose.Types.ObjectId(restaurantId) },
    { scope: 'regional', region, cuisineType },
    { scope: 'regional', region },
    { scope: 'global', cuisineType },
    { scope: 'global' }
  ];

  if (type) {
    queries.forEach(q => (q as any).type = type);
  }

  queries.forEach(q => {
    (q as any).isActive = true;
    (q as any).confidence = { $gte: 60 };
  });

  return Promise.all(
    queries.map(query => this.find(query).sort({ confidence: -1 }).limit(10))
  ).then(results => {
    // Flatten and deduplicate by taking highest confidence version
    const seen = new Set();
    const merged: any[] = [];

    results.forEach(resultSet => {
      resultSet.forEach((correlation: any) => {
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

CorrelationSchema.statics.getMostReliable = function(limit: number = 20) {
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
export default (mongoose.models.Correlation as ICorrelationModel) ||
  mongoose.model<ICorrelation, ICorrelationModel>('Correlation', CorrelationSchema);
