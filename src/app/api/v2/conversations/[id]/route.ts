/**
 * Single Conversation API
 * GET /api/v2/conversations/[id] - Get conversation details
 * PUT /api/v2/conversations/[id] - Update conversation
 * DELETE /api/v2/conversations/[id] - Delete/leave conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Conversation } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - Get conversation details
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

    const conversation = await Conversation.findOne({
      _id: params.id,
      restaurantId: user.restaurantId,
      'participants.userId': user.userId
    }).lean();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update conversation (name, description, participants)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('chat', 'write')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { name, description } = body;

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: params.id,
        restaurantId: user.restaurantId,
        'participants.userId': user.userId
      },
      {
        $set: {
          ...(name && { name }),
          ...(description && { description })
        }
      },
      { new: true }
    );

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Leave conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('chat', 'write')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    // Remove user from participants
    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: params.id,
        restaurantId: user.restaurantId,
        'participants.userId': user.userId
      },
      {
        $pull: {
          participants: { userId: user.userId }
        }
      },
      { new: true }
    );

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // If no participants left, mark as inactive
    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndUpdate(params.id, {
        isActive: false
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Left conversation'
    });
  } catch (error) {
    console.error('Error leaving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to leave conversation' },
      { status: 500 }
    );
  }
}
