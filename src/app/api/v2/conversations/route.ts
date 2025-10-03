/**
 * Conversations API
 * GET /api/v2/conversations - List user's conversations
 * POST /api/v2/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Conversation } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - List conversations for authenticated user
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('chat', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const conversations = await Conversation.find({
      restaurantId: user.restaurantId,
      'participants.userId': user.userId,
      isActive: true
    })
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: conversations.map(conv => ({
        ...conv,
        unreadCount: 0 // TODO: Calculate from messages where readBy doesn't include user
      }))
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new conversation
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('chat', 'write')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { type, participantIds, name, description } = body;

    // Validate
    if (!type || !participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json(
        { error: 'type and participantIds are required' },
        { status: 400 }
      );
    }

    // Check for existing direct conversation
    if (type === 'direct' && participantIds.length === 1) {
      const existing = await Conversation.findOne({
        restaurantId: user.restaurantId,
        type: 'direct',
        'participants.userId': { $all: [user.userId, participantIds[0]] }
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing,
          existing: true
        });
      }
    }

    // TODO: Fetch participant details from Restaurant/User model
    // For now, use basic info
    const participants = [
      {
        userId: user.userId,
        name: user.email.split('@')[0],
        role: user.role,
        joinedAt: new Date()
      },
      ...participantIds.map((id: string) => ({
        userId: id,
        name: 'User ' + id.slice(0, 4),
        role: 'employee',
        joinedAt: new Date()
      }))
    ];

    const conversation = await Conversation.create({
      restaurantId: user.restaurantId,
      type,
      participants,
      name: type === 'group' ? name : undefined,
      description: type === 'group' ? description : undefined,
      isActive: true,
      createdBy: user.userId
    });

    return NextResponse.json({
      success: true,
      data: conversation
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
