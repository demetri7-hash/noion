import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Job Model
 *
 * Stores job positions/roles from Toast POS
 * Examples: Server, Cook, Manager, Bartender, Host
 * Used to track labor costs by role and analyze productivity by position
 */

export interface IJob extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastJobGuid: string;

  title: string; // "Server", "Cook", "Manager", etc.
  description?: string;
  defaultWage: number;
  tipEligible: boolean;

  isActive: boolean;
  createdDate: Date;
  modifiedDate: Date;
}

const jobSchema = new Schema<IJob>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    toastJobGuid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    defaultWage: {
      type: Number,
      required: true
    },
    tipEligible: {
      type: Boolean,
      required: true,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdDate: {
      type: Date,
      required: true
    },
    modifiedDate: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'jobs'
  }
);

// Compound indexes
jobSchema.index({ restaurantId: 1, isActive: 1 });
jobSchema.index({ restaurantId: 1, title: 1 });

// Export the model (handle Next.js hot reload in dev mode)
export default (mongoose.models.Job as mongoose.Model<IJob>) ||
  mongoose.model<IJob>('Job', jobSchema);
