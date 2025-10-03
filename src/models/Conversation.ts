/**
 * Conversation Model
 * Manages chat conversations (1-on-1, group, announcements)
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  restaurantId: Types.ObjectId;

  // Conversation type
  type: 'direct' | 'group' | 'announcement';

  // Participants
  participants: Array<{
    userId: string;
    name: string;
    role: string;
    joinedAt: Date;
    lastReadAt?: Date;
  }>;

  // Group conversation details
  name?: string; // For group chats
  description?: string;

  // Last message info (for quick preview)
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    sentAt: Date;
  };

  // Metadata
  isActive: boolean;
  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true
  }
);

// Indexes for performance
ConversationSchema.index({ restaurantId: 1, type: 1 });
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ 'lastMessage.sentAt': -1 });

export default (mongoose.models.Conversation as mongoose.Model<IConversation>) ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);
