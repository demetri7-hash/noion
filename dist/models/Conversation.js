"use strict";
/**
 * Conversation Model
 * Manages chat conversations (1-on-1, group, announcements)
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
const ConversationSchema = new mongoose_1.Schema({
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['direct', 'group', 'announcement'],
        required: true
    },
    participants: [{
            userId: { type: String, required: true },
            name: { type: String, required: true },
            role: { type: String, required: true },
            joinedAt: { type: Date, default: Date.now },
            lastReadAt: Date
        }],
    name: String,
    description: String,
    lastMessage: {
        content: String,
        senderId: String,
        senderName: String,
        sentAt: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
// Indexes for performance
ConversationSchema.index({ restaurantId: 1, type: 1 });
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ 'lastMessage.sentAt': -1 });
exports.default = mongoose_1.default.models.Conversation ||
    mongoose_1.default.model('Conversation', ConversationSchema);
