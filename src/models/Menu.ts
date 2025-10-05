import { Schema, model, Document, Types } from 'mongoose';

/**
 * Menu Model
 *
 * Stores menu structures from Toast POS
 * Examples: Lunch Menu, Dinner Menu, Happy Hour, Brunch
 * Tracks which items are available during which time periods
 */

export interface IMenuGroup {
  toastGroupGuid: string;
  name: string; // "Appetizers", "Entrees", "Desserts", "Drinks"
  items: string[]; // Array of Toast item GUIDs
}

export interface IMenu extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastMenuGuid: string;

  name: string; // "Lunch", "Dinner", "Happy Hour", "Brunch"
  description?: string;

  groups: IMenuGroup[]; // Categories/sections within the menu

  isActive: boolean;
  lastSyncedAt: Date;
}

const menuGroupSchema = new Schema<IMenuGroup>(
  {
    toastGroupGuid: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    items: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const menuSchema = new Schema<IMenu>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    toastMenuGuid: {
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

    groups: {
      type: [menuGroupSchema],
      default: []
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastSyncedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'menus'
  }
);

// Compound indexes
menuSchema.index({ restaurantId: 1, isActive: 1 });
menuSchema.index({ restaurantId: 1, name: 1 });

const Menu = model<IMenu>('Menu', menuSchema);

export default Menu;
