"use strict";
/**
 * Workflow Template Model
 * Reusable workflow blueprints created by managers
 */
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
const mongoose_1 = __importStar(require("mongoose"));
const WorkflowTemplateSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 100,
    },
    description: {
        type: String,
        maxlength: 500,
    },
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    tasks: [{
            title: { type: String, required: true },
            description: String,
            order: { type: Number, required: true },
            requiresPhoto: { type: Boolean, default: false },
            requiresSignature: { type: Boolean, default: false },
            requiresNotes: { type: Boolean, default: false },
            photoInstructions: String,
            notesPlaceholder: String,
            estimatedMinutes: Number,
            points: { type: Number, default: 10 },
        }],
    recurring: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'custom'],
        },
        daysOfWeek: [{
                type: String,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            }],
        dayOfMonth: Number,
        timeOfDay: String,
        endDate: Date,
    },
    assignmentType: {
        type: String,
        enum: ['specific_users', 'role', 'any_available'],
        default: 'specific_users',
    },
    assignedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
        }],
    assignedRole: String,
    isActive: { type: Boolean, default: true },
    category: String,
    color: String,
}, {
    timestamps: true,
});
// Indexes
WorkflowTemplateSchema.index({ restaurantId: 1, isActive: 1 });
WorkflowTemplateSchema.index({ createdBy: 1 });
exports.default = mongoose_1.default.models.WorkflowTemplate ||
    mongoose_1.default.model('WorkflowTemplate', WorkflowTemplateSchema);
