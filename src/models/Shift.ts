import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Shift Model
 *
 * Stores scheduled shifts from Toast POS
 * Used to compare scheduled vs actual hours worked
 * Helps identify no-shows, schedule adherence, and optimal staffing levels
 */

export interface IShift extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastShiftGuid: string;

  employeeId: Types.ObjectId;
  employeeToastGuid: string;
  jobId: Types.ObjectId;
  jobToastGuid: string;

  scheduledStart: Date;
  scheduledEnd: Date;
  businessDate: Date;

  actualTimeEntryId?: Types.ObjectId; // Link to actual TimeEntry if worked

  createdDate: Date;
  modifiedDate: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    toastShiftGuid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    employeeToastGuid: {
      type: String,
      required: true
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    jobToastGuid: {
      type: String,
      required: true
    },

    scheduledStart: {
      type: Date,
      required: true
    },
    scheduledEnd: {
      type: Date,
      required: true
    },
    businessDate: {
      type: Date,
      required: true,
      index: true
    },

    actualTimeEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'TimeEntry'
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
    collection: 'shifts'
  }
);

// Compound indexes for efficient queries
shiftSchema.index({ restaurantId: 1, businessDate: -1 });
shiftSchema.index({ restaurantId: 1, employeeId: 1, businessDate: -1 });
shiftSchema.index({ restaurantId: 1, scheduledStart: -1 });

// Export the model (handle Next.js hot reload in dev mode)
export default (mongoose.models.Shift as mongoose.Model<IShift>) ||
  mongoose.model<IShift>('Shift', shiftSchema);
