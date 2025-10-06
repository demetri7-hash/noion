import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * MenuItem Model
 *
 * Stores individual menu items from Toast POS
 * Tracks current pricing and historical price changes
 * Used for menu optimization, profit analysis, and upsell detection
 */

export interface IModifier {
  toastModifierGuid: string;
  name: string; // "Add Cheese", "Extra Sauce", "Make it Spicy"
  price: number;
  isDefault: boolean;
}

export interface IPriceHistoryEntry {
  price: number;
  effectiveDate: Date;
}

export interface IMenuItem extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastItemGuid: string;

  name: string;
  description?: string;
  sku?: string;

  price: number;
  taxRate?: number;

  category: string; // "Appetizers", "Entrees", etc.
  isActive: boolean;

  modifiers?: IModifier[];

  // Historical price tracking
  priceHistory: IPriceHistoryEntry[];

  // Nutritional info (if available)
  calories?: number;

  lastSyncedAt: Date;
}

const modifierSchema = new Schema<IModifier>(
  {
    toastModifierGuid: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const priceHistorySchema = new Schema<IPriceHistoryEntry>(
  {
    price: {
      type: Number,
      required: true
    },
    effectiveDate: {
      type: Date,
      required: true
    }
  },
  {
    _id: false
  }
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    toastItemGuid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    sku: {
      type: String
    },

    price: {
      type: Number,
      required: true
    },
    taxRate: {
      type: Number
    },

    category: {
      type: String,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    modifiers: {
      type: [modifierSchema],
      default: []
    },

    priceHistory: {
      type: [priceHistorySchema],
      default: []
    },

    calories: {
      type: Number
    },

    lastSyncedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'menuitems'
  }
);

// Compound indexes for efficient queries
menuItemSchema.index({ restaurantId: 1, isActive: 1 });
menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, name: 1 });

// Pre-save hook to track price changes
menuItemSchema.pre('save', function (next) {
  if (this.isModified('price')) {
    // If price changed, add to history
    const lastPrice = this.priceHistory[this.priceHistory.length - 1];
    if (!lastPrice || lastPrice.price !== this.price) {
      this.priceHistory.push({
        price: this.price,
        effectiveDate: new Date()
      });
    }
  }
  next();
});

// Export the model (handle Next.js hot reload in dev mode)
export default (mongoose.models.MenuItem as mongoose.Model<IMenuItem>) ||
  mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
