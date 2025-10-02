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
const mongoose_1 = __importStar(require("mongoose"));
const SyncJobSchema = new mongoose_1.Schema({
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true
});
// Index for efficient querying
SyncJobSchema.index({ restaurantId: 1, createdAt: -1 });
SyncJobSchema.index({ status: 1, createdAt: -1 });
const SyncJob = mongoose_1.default.models.SyncJob || mongoose_1.default.model('SyncJob', SyncJobSchema);
exports.default = SyncJob;
