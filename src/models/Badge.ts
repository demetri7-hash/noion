/**
 * Badge Model
 * Defines available badges and their unlock criteria
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IBadge extends Document {
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  category: 'performance' | 'consistency' | 'team' | 'special';

  // Unlock criteria
  criteria: {
    type: 'tasks_completed' | 'streak' | 'points' | 'photo_tasks' | 'signature_tasks' | 'workflows_completed' | 'custom';
    threshold?: number;
    customCheck?: string; // Function name for custom logic
  };

  // Rarity
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  // Bonus
  pointsBonus: number; // Extra points for unlocking

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  description: {
    type: String,
    required: true,
  },

  icon: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: ['performance', 'consistency', 'team', 'special'],
    required: true,
  },

  criteria: {
    type: {
      type: String,
      enum: ['tasks_completed', 'streak', 'points', 'photo_tasks', 'signature_tasks', 'workflows_completed', 'custom'],
      required: true,
    },
    threshold: Number,
    customCheck: String,
  },

  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },

  pointsBonus: {
    type: Number,
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
BadgeSchema.index({ isActive: 1 });
BadgeSchema.index({ category: 1 });

export default (mongoose.models.Badge as mongoose.Model<IBadge>) ||
  mongoose.model<IBadge>('Badge', BadgeSchema);
