/**
 * Message Model
 * For real-time team chat and communication
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  restaurantId: Types.ObjectId;

  // Sender info
  sender: {
    id: string;
    name: string;
    role: string;
  };

  // Message content
  type: 'text' | 'image' | 'file' | 'system';
  content: string;

  // File attachment (if type is image or file)
  attachment?: {
    url: string;
    filename: string;
    fileType: string;
    fileSize: number;
  };

  // Read receipts
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;

  // Metadata
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    sender: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true }
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    attachment: {
      url: String,
      filename: String,
      fileType: String,
      fileSize: Number
    },
    readBy: [{
      userId: { type: String, required: true },
      readAt: { type: Date, default: Date.now }
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ restaurantId: 1, createdAt: -1 });
MessageSchema.index({ 'sender.id': 1 });

export default (mongoose.models.Message as mongoose.Model<IMessage>) ||
  mongoose.model<IMessage>('Message', MessageSchema);
