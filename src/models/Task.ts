/**
 * Task Model
 * Individual tasks within workflow instances
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITask extends Document {
  workflowId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  assignedTo: Types.ObjectId;

  title: string;
  description?: string;
  order: number;

  // Requirements
  requiresPhoto: boolean;
  requiresSignature: boolean;
  requiresNotes: boolean;

  photoInstructions?: string;
  notesPlaceholder?: string;

  // Status
  status: 'pending' | 'completed' | 'skipped';

  // Completion data
  completedAt?: Date;

  // Photo attachment (GridFS file ID or URL)
  photoId?: string;
  photoUrl?: string;

  // Signature (Base64 or GridFS)
  signatureId?: string;
  signatureUrl?: string;

  // Notes
  notes?: string;

  // Time tracking
  startedAt?: Date;
  completionTime?: number; // Minutes

  // Points
  points: number;

  // Audit trail
  editHistory: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    editedBy: Types.ObjectId;
    editedAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },

  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  assignedTo: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  title: { type: String, required: true },
  description: String,
  order: { type: Number, required: true },

  requiresPhoto: { type: Boolean, default: false },
  requiresSignature: { type: Boolean, default: false },
  requiresNotes: { type: Boolean, default: false },

  photoInstructions: String,
  notesPlaceholder: String,

  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending',
  },

  completedAt: Date,

  photoId: String,
  photoUrl: String,

  signatureId: String,
  signatureUrl: String,

  notes: String,

  startedAt: Date,
  completionTime: Number,

  points: { type: Number, default: 10 },

  editHistory: [{
    field: String,
    oldValue: String,
    newValue: String,
    editedBy: { type: Schema.Types.ObjectId },
    editedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Indexes
TaskSchema.index({ workflowId: 1, order: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ restaurantId: 1, completedAt: 1 });

export default (mongoose.models.Task as mongoose.Model<ITask>) ||
  mongoose.model<ITask>('Task', TaskSchema);
