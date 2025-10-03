/**
 * Workflow Model
 * Specific instances of workflow templates assigned to employees
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWorkflow extends Document {
  templateId: Types.ObjectId;
  restaurantId: Types.ObjectId;

  name: string;
  description?: string;

  // Assignment
  assignedTo: Types.ObjectId;

  // Scheduled time
  scheduledDate: Date;
  scheduledTime?: string;

  // Due date (when it must be completed by)
  dueDate: Date;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'missed';

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;

  // Completion info
  totalTasks: number;
  completedTasks: number;

  // Points earned
  pointsAwarded: number;

  // Can edit until this time (midnight of completion day)
  editableUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkflowTemplate',
    required: true,
  },

  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  name: { type: String, required: true },
  description: String,

  assignedTo: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  scheduledDate: { type: Date, required: true },
  scheduledTime: String,

  dueDate: { type: Date, required: true },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'missed'],
    default: 'pending',
  },

  startedAt: Date,
  completedAt: Date,

  totalTasks: { type: Number, required: true },
  completedTasks: { type: Number, default: 0 },

  pointsAwarded: { type: Number, default: 0 },

  editableUntil: Date,
}, {
  timestamps: true,
});

// Indexes
WorkflowSchema.index({ assignedTo: 1, status: 1 });
WorkflowSchema.index({ restaurantId: 1, scheduledDate: 1 });
WorkflowSchema.index({ templateId: 1 });
WorkflowSchema.index({ dueDate: 1, status: 1 });

export default (mongoose.models.Workflow as mongoose.Model<IWorkflow>) ||
  mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
