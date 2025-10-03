/**
 * Workflow Template Model
 * Reusable workflow blueprints created by managers
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkflowTemplate extends Document {
  name: string;
  description?: string;
  restaurantId: Types.ObjectId;
  createdBy: Types.ObjectId;

  // Array of task templates
  tasks: Array<{
    title: string;
    description?: string;
    order: number;

    // Requirements
    requiresPhoto: boolean;
    requiresSignature: boolean;
    requiresNotes: boolean;

    // Optional fields
    photoInstructions?: string;
    notesPlaceholder?: string;

    // Estimated time to complete (minutes)
    estimatedMinutes?: number;

    // Points awarded for completion
    points: number;
  }>;

  // Recurrence settings
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
    daysOfWeek?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;
    dayOfMonth?: number; // 1-31
    timeOfDay?: string; // "08:00"
    endDate?: Date;
  };

  // Assignment
  assignmentType: 'specific_users' | 'role' | 'any_available';
  assignedUsers?: Types.ObjectId[];
  assignedRole?: string;

  // Settings
  isActive: boolean;
  category?: string;
  color?: string;

  createdAt: Date;
  updatedAt: Date;
}

const WorkflowTemplateSchema = new Schema<IWorkflowTemplate>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },

  description: {
    type: String,
    maxlength: 500,
  },

  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  tasks: [{
    title: { type: String, required: true },
    description: String,
    order: { type: Number, required: true },

    requiresPhoto: { type: Boolean, default: false },
    requiresSignature: { type: Boolean, default: false },
    requiresNotes: { type: Boolean, default: false },

    photoInstructions: String,
    notesPlaceholder: String,

    estimatedMinutes: Number,

    points: { type: Number, default: 10 },
  }],

  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    dayOfMonth: Number,
    timeOfDay: String,
    endDate: Date,
  },

  assignmentType: {
    type: String,
    enum: ['specific_users', 'role', 'any_available'],
    default: 'specific_users',
  },

  assignedUsers: [{
    type: Schema.Types.ObjectId,
  }],

  assignedRole: String,

  isActive: { type: Boolean, default: true },
  category: String,
  color: String,
}, {
  timestamps: true,
});

// Indexes
WorkflowTemplateSchema.index({ restaurantId: 1, isActive: 1 });
WorkflowTemplateSchema.index({ createdBy: 1 });

export default (mongoose.models.WorkflowTemplate as mongoose.Model<IWorkflowTemplate>) ||
  mongoose.model<IWorkflowTemplate>('WorkflowTemplate', WorkflowTemplateSchema);
