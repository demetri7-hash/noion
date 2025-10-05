import { Schema, model, Document, Types } from 'mongoose';

/**
 * TimeEntry Model
 *
 * Stores employee clock-in/out data from Toast POS
 * Used for labor cost analysis, productivity tracking, and schedule optimization
 */

export interface ITimeEntry extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastTimeEntryGuid: string;

  employeeId: Types.ObjectId; // Link to Employee model
  employeeToastGuid: string;
  jobId?: Types.ObjectId; // Link to Job model
  jobToastGuid?: string;

  clockInTime: Date;
  clockOutTime?: Date; // Null if still clocked in
  breakDuration: number; // Minutes

  regularHours: number;
  overtimeHours: number;
  doubleOvertimeHours?: number;

  hourlyWage: number;
  tipsEarned?: number;

  businessDate: Date; // Toast business date (not calendar date)
  createdDate: Date;
  modifiedDate: Date;

  // Calculated fields
  totalHours: number;
  totalPay: number;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    toastTimeEntryGuid: {
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
      required: true,
      index: true
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job'
    },
    jobToastGuid: {
      type: String
    },

    clockInTime: {
      type: Date,
      required: true
    },
    clockOutTime: {
      type: Date
    },
    breakDuration: {
      type: Number,
      default: 0
    },

    regularHours: {
      type: Number,
      required: true,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    doubleOvertimeHours: {
      type: Number,
      default: 0
    },

    hourlyWage: {
      type: Number,
      required: true
    },
    tipsEarned: {
      type: Number
    },

    businessDate: {
      type: Date,
      required: true,
      index: true
    },
    createdDate: {
      type: Date,
      required: true
    },
    modifiedDate: {
      type: Date,
      required: true
    },

    totalHours: {
      type: Number,
      required: true
    },
    totalPay: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'timeentries'
  }
);

// Compound indexes for efficient queries
timeEntrySchema.index({ restaurantId: 1, businessDate: -1 });
timeEntrySchema.index({ restaurantId: 1, employeeId: 1, businessDate: -1 });
timeEntrySchema.index({ restaurantId: 1, clockInTime: -1 });

// Pre-save hook to calculate totals
timeEntrySchema.pre('save', function (next) {
  // Calculate total hours
  this.totalHours = this.regularHours + this.overtimeHours + (this.doubleOvertimeHours || 0);

  // Calculate total pay (regular + overtime[1.5x] + double overtime[2x])
  this.totalPay =
    this.regularHours * this.hourlyWage +
    this.overtimeHours * this.hourlyWage * 1.5 +
    (this.doubleOvertimeHours || 0) * this.hourlyWage * 2;

  next();
});

const TimeEntry = model<ITimeEntry>('TimeEntry', timeEntrySchema);

export default TimeEntry;
