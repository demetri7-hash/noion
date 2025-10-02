import mongoose, { Schema, Document } from 'mongoose';

/**
 * SyncJob Model
 * Tracks background synchronization jobs for POS data imports
 */

export interface ISyncJob extends Document {
  restaurantId: mongoose.Types.ObjectId;
  posType: 'toast' | 'square' | 'clover';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  jobId: string; // BullMQ job ID

  // Progress tracking
  progress: {
    currentPage?: number;
    totalPages?: number;
    ordersProcessed: number;
    estimatedTotal?: number;
  };

  // Results
  result?: {
    ordersImported: number;
    ordersFailed: number;
    totalPages: number;
    duration: number; // milliseconds
    startDate: Date;
    endDate: Date;
  };

  // Error handling
  error?: {
    message: string;
    code?: string;
    stack?: string;
    timestamp: Date;
  };

  // Retry tracking
  attempts: number;
  maxAttempts: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Notifications
  notificationSent: boolean;
  notificationEmail?: string;
}

const SyncJobSchema = new Schema<ISyncJob>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    posType: {
      type: String,
      enum: ['toast', 'square', 'clover'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    progress: {
      currentPage: { type: Number },
      totalPages: { type: Number },
      ordersProcessed: { type: Number, default: 0 },
      estimatedTotal: { type: Number }
    },
    result: {
      ordersImported: { type: Number },
      ordersFailed: { type: Number },
      totalPages: { type: Number },
      duration: { type: Number },
      startDate: { type: Date },
      endDate: { type: Date }
    },
    error: {
      message: { type: String },
      code: { type: String },
      stack: { type: String },
      timestamp: { type: Date }
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationEmail: { type: String }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
SyncJobSchema.index({ restaurantId: 1, createdAt: -1 });
SyncJobSchema.index({ status: 1, createdAt: -1 });

const SyncJob = mongoose.models.SyncJob || mongoose.model<ISyncJob>('SyncJob', SyncJobSchema);

export default SyncJob;
