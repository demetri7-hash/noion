/**
 * Audit Log Model
 * Complete audit trail for all workflow/task actions
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  restaurantId: Types.ObjectId;

  // What was affected
  entityType: 'workflow' | 'task' | 'workflow_template';
  entityId: Types.ObjectId;

  // Who did it
  userId: Types.ObjectId;

  // What they did
  action: 'create' | 'update' | 'delete' | 'complete' | 'skip';

  // Details
  changes?: any; // Object with old/new values

  // Context
  ipAddress?: string;
  userAgent?: string;

  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },

  entityType: {
    type: String,
    enum: ['workflow', 'task', 'workflow_template'],
    required: true,
  },

  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'complete', 'skip'],
    required: true,
  },

  changes: Schema.Types.Mixed,

  ipAddress: String,
  userAgent: String,

  timestamp: { type: Date, default: Date.now },
});

// Indexes
AuditLogSchema.index({ restaurantId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1 });

export default (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
