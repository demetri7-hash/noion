/**
 * Tasks API
 * GET /api/v2/tasks - List tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Task } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - List tasks
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('tasks:own', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const query: any = {
      restaurantId: user.restaurantId,
    };

    // Employees see only their own tasks
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (workflowId) {
      query.workflowId = workflowId;
    }

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .sort({ workflowId: 1, order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
