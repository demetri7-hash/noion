import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * ConfigMapping Model
 *
 * Stores mappings from Toast GUIDs to human-readable names
 * for service areas, revenue centers, dining options, etc.
 *
 * This allows us to display "Patio" instead of "a7d9-8f2e-11eb-9e3c"
 */

export enum ConfigMappingType {
  SERVICE_AREA = 'service_area',
  REVENUE_CENTER = 'revenue_center',
  DINING_OPTION = 'dining_option',
  MENU_ITEM = 'menu_item',
  MODIFIER_GROUP = 'modifier_group',
  EMPLOYEE = 'employee',
  JOB_TITLE = 'job_title'
}

export interface IConfigMapping extends Document {
  restaurantId: Types.ObjectId;
  type: ConfigMappingType;
  guid: string;              // Toast GUID
  name: string;              // Human-readable name
  active?: boolean;          // Is this still active?
  metadata?: {               // Additional data specific to type
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConfigMappingSchema = new Schema<IConfigMapping>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(ConfigMappingType),
      required: true,
      index: true
    },
    guid: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookups
ConfigMappingSchema.index({ restaurantId: 1, type: 1, guid: 1 }, { unique: true });
ConfigMappingSchema.index({ restaurantId: 1, type: 1, active: 1 });

// Static method to bulk upsert mappings
ConfigMappingSchema.statics.bulkUpsertMappings = async function(
  restaurantId: string,
  type: ConfigMappingType,
  mappings: Map<string, string>
) {
  const operations = Array.from(mappings.entries()).map(([guid, name]) => ({
    updateOne: {
      filter: { restaurantId, type, guid },
      update: {
        $set: {
          name,
          active: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          restaurantId,
          type,
          guid,
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  if (operations.length > 0) {
    await this.bulkWrite(operations);
    console.log(`✅ Upserted ${operations.length} ${type} mappings`);
  }
};

// Static method to get mapping by GUID
ConfigMappingSchema.statics.getNameByGuid = async function(
  restaurantId: string,
  type: ConfigMappingType,
  guid: string
): Promise<string | null> {
  const mapping = await this.findOne({
    restaurantId,
    type,
    guid,
    active: true
  });

  return mapping ? mapping.name : null;
};

// Static method to get all mappings for a type
ConfigMappingSchema.statics.getMappingsForType = async function(
  restaurantId: string,
  type: ConfigMappingType
): Promise<Map<string, string>> {
  const mappings = await this.find({
    restaurantId,
    type,
    active: true
  });

  const map = new Map<string, string>();
  mappings.forEach((m: IConfigMapping) => {
    map.set(m.guid, m.name);
  });

  return map;
};

// Export the model (handle Next.js hot reload in dev mode)
export const ConfigMapping = (mongoose.models.ConfigMapping as mongoose.Model<IConfigMapping>) ||
  mongoose.model<IConfigMapping>('ConfigMapping', ConfigMappingSchema);
