"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigMapping = exports.ConfigMappingType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * ConfigMapping Model
 *
 * Stores mappings from Toast GUIDs to human-readable names
 * for service areas, revenue centers, dining options, etc.
 *
 * This allows us to display "Patio" instead of "a7d9-8f2e-11eb-9e3c"
 */
var ConfigMappingType;
(function (ConfigMappingType) {
    ConfigMappingType["SERVICE_AREA"] = "service_area";
    ConfigMappingType["REVENUE_CENTER"] = "revenue_center";
    ConfigMappingType["DINING_OPTION"] = "dining_option";
    ConfigMappingType["MENU_ITEM"] = "menu_item";
    ConfigMappingType["MODIFIER_GROUP"] = "modifier_group";
    ConfigMappingType["EMPLOYEE"] = "employee";
    ConfigMappingType["JOB_TITLE"] = "job_title";
})(ConfigMappingType || (exports.ConfigMappingType = ConfigMappingType = {}));
const ConfigMappingSchema = new mongoose_1.Schema({
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed
    }
}, {
    timestamps: true
});
// Compound index for fast lookups
ConfigMappingSchema.index({ restaurantId: 1, type: 1, guid: 1 }, { unique: true });
ConfigMappingSchema.index({ restaurantId: 1, type: 1, active: 1 });
// Static method to bulk upsert mappings
ConfigMappingSchema.statics.bulkUpsertMappings = async function (restaurantId, type, mappings) {
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
ConfigMappingSchema.statics.getNameByGuid = async function (restaurantId, type, guid) {
    const mapping = await this.findOne({
        restaurantId,
        type,
        guid,
        active: true
    });
    return mapping ? mapping.name : null;
};
// Static method to get all mappings for a type
ConfigMappingSchema.statics.getMappingsForType = async function (restaurantId, type) {
    const mappings = await this.find({
        restaurantId,
        type,
        active: true
    });
    const map = new Map();
    mappings.forEach((m) => {
        map.set(m.guid, m.name);
    });
    return map;
};
// Export the model (handle Next.js hot reload in dev mode)
exports.ConfigMapping = mongoose_1.default.models.ConfigMapping ||
    mongoose_1.default.model('ConfigMapping', ConfigMappingSchema);
