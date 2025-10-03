/**
 * User Badge Model
 * Junction table linking users to unlocked badges
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserBadge extends Document {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  badgeId: Types.ObjectId;
  unlockedAt: Date;

  // Context when unlocked
  contextData?: any;
}

const UserBadgeSchema = new Schema<IUserBadge>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  badgeId: {
    type: Schema.Types.ObjectId,
    ref: 'Badge',
    required: true,
  },

  unlockedAt: {
    type: Date,
    default: Date.now,
  },

  contextData: Schema.Types.Mixed,
});

// Compound unique index - user can only unlock each badge once
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ userId: 1, unlockedAt: -1 });

export default (mongoose.models.UserBadge as mongoose.Model<IUserBadge>) ||
  mongoose.model<IUserBadge>('UserBadge', UserBadgeSchema);
