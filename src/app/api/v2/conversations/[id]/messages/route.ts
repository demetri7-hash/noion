/**
 * Messages API
 * GET /api/v2/conversations/[id]/messages - Get messages in conversation
 * POST /api/v2/conversations/[id]/messages - Send new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Message, Conversation } from '@/models';
import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

/**
 * GET - Fetch messages for conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('chat', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Message ID for pagination

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: params.id,
      restaurantId: user.restaurantId,
      'participants.userId': user.userId
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Build query
    const query: any = {
      conversationId: new Types.ObjectId(params.id),
      isDeleted: false
    };

    if (before) {
      query._id = { $lt: new Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: new Types.ObjectId(params.id),
        'sender.id': { $ne: user.userId },
        'readBy.userId': { $ne: user.userId }
      },
      {
        $push: {
          readBy: {
            userId: user.userId,
            readAt: new Date()
          }
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: messages.reverse() // Oldest first
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST - Send new message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('chat', 'write')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { content, type = 'text', attachment } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: params.id,
      restaurantId: user.restaurantId,
      'participants.userId': user.userId
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = await Message.create({
      conversationId: new Types.ObjectId(params.id),
      restaurantId: user.restaurantId,
      sender: {
        id: user.userId,
        name: user.email.split('@')[0],
        role: user.role
      },
      type,
      content,
      attachment,
      readBy: [{
        userId: user.userId,
        readAt: new Date()
      }]
    });

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(params.id, {
      lastMessage: {
        content: content.substring(0, 100),
        senderId: user.userId,
        senderName: user.email.split('@')[0],
        sentAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: message
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
