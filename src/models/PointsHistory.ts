/**
 * Points History Model
 * Track all points earned by users
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPointsHistory extends Document {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  points: number;
  reason: string;

  // Breakdown of how points were calculated
  breakdown: {
    basePoints: number;
    bonuses: {
      perfectWorkflow?: number;
      onTime?: number;
      early?: number;
      streak?: number;
      photo?: number;
    };
    multiplier: number;
  };

  // Context
  entityType?: 'task' | 'workflow' | 'manual';
  entityId?: Types.ObjectId;

  timestamp: Date;
}

const PointsHistorySchema = new Schema<IPointsHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  points: {
    type: Number,
    required: true,
  },

  reason: {
    type: String,
    required: true,
  },

  breakdown: {
    basePoints: Number,
    bonuses: {
      perfectWorkflow: Number,
      onTime: Number,
      early: Number,
      streak: Number,
      photo: Number,
    },
    multiplier: Number,
  },

  entityType: {
    type: String,
    enum: ['task', 'workflow', 'manual'],
  },

  entityId: Schema.Types.ObjectId,

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
PointsHistorySchema.index({ userId: 1, timestamp: -1 });
PointsHistorySchema.index({ restaurantId: 1, timestamp: -1 });
PointsHistorySchema.index({ timestamp: -1 });

export default (mongoose.models.PointsHistory as mongoose.Model<IPointsHistory>) ||
  mongoose.model<IPointsHistory>('PointsHistory', PointsHistorySchema);
