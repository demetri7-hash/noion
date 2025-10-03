/**
 * Workflows API (Instances)
 * GET /api/v2/workflows - List workflow instances
 * POST /api/v2/workflows - Create workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Workflow, WorkflowTemplate, Task, AuditLog } from '@/models';
import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

/**
 * GET - List workflow instances
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('tasks:own', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const query: any = {
      restaurantId: user.restaurantId,
    };

    // Employees see only their own workflows, managers/admins see all
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) {
      query.status = status;
    }

    const workflows = await Workflow.find(query)
      .sort({ scheduledDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create workflow instance from template
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('workflows:team', 'create')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { templateId, assignedTo, scheduledDate, dueDate } = body;

    if (!templateId || !assignedTo || !scheduledDate) {
      return NextResponse.json(
        { error: 'templateId, assignedTo, and scheduledDate are required' },
        { status: 400 }
      );
    }

    // Get template
    const template = await WorkflowTemplate.findOne({
      _id: templateId,
      restaurantId: user.restaurantId,
      isActive: true
    }).lean();

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create workflow instance
    const workflow = await Workflow.create({
      templateId: new Types.ObjectId(templateId),
      restaurantId: user.restaurantId,
      name: template.name,
      description: template.description,
      assignedTo: new Types.ObjectId(assignedTo),
      scheduledDate: new Date(scheduledDate),
      dueDate: dueDate ? new Date(dueDate) : new Date(scheduledDate),
      status: 'pending',
      totalTasks: template.tasks.length,
      completedTasks: 0,
      pointsAwarded: 0
    });

    // Create tasks from template
    const tasks = await Task.insertMany(
      template.tasks.map((taskTemplate: any) => ({
        workflowId: workflow._id,
        restaurantId: user.restaurantId,
        assignedTo: new Types.ObjectId(assignedTo),
        title: taskTemplate.title,
        description: taskTemplate.description,
        order: taskTemplate.order,
        requiresPhoto: taskTemplate.requiresPhoto,
        requiresSignature: taskTemplate.requiresSignature,
        requiresNotes: taskTemplate.requiresNotes,
        photoInstructions: taskTemplate.photoInstructions,
        notesPlaceholder: taskTemplate.notesPlaceholder,
        points: taskTemplate.points,
        status: 'pending'
      }))
    );

    // Create audit log
    await AuditLog.create({
      restaurantId: user.restaurantId,
      entityType: 'workflow',
      entityId: workflow._id,
      userId: user.userId,
      action: 'create',
      changes: {
        templateId,
        assignedTo,
        scheduledDate
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        workflow,
        tasks
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
