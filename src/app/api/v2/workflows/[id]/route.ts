/**
 * Single Workflow API
 * GET /api/v2/workflows/[id] - Get workflow with tasks
 * PUT /api/v2/workflows/[id] - Update workflow status
 * DELETE /api/v2/workflows/[id] - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Workflow, Task } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - Get workflow details with tasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('tasks:own', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const query: any = {
      _id: params.id,
      restaurantId: user.restaurantId
    };

    // Employees can only see their own workflows
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    }

    const workflow = await Workflow.findOne(query).lean();

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get tasks for this workflow
    const tasks = await Task.find({
      workflowId: params.id,
      restaurantId: user.restaurantId
    })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...workflow,
        tasks
      }
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update workflow status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('tasks:own', 'update')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { status } = body;

    const query: any = {
      _id: params.id,
      restaurantId: user.restaurantId
    };

    // Employees can only update their own workflows
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    }

    const updateData: any = {};

    if (status === 'in_progress' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
      // Set editable until midnight
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      updateData.editableUntil = midnight;
    }

    if (status) {
      updateData.status = status;
    }

    const workflow = await Workflow.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('workflows:all', 'delete')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    // Mark workflow as missed
    const workflow = await Workflow.findOneAndUpdate(
      {
        _id: params.id,
        restaurantId: user.restaurantId
      },
      {
        $set: { status: 'missed' }
      },
      { new: true }
    );

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
