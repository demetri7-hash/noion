/**
 * Single Workflow Template API
 * GET /api/v2/workflows/templates/[id] - Get template details
 * PUT /api/v2/workflows/templates/[id] - Update template
 * DELETE /api/v2/workflows/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { WorkflowTemplate } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - Get template details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('workflows:templates', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const template = await WorkflowTemplate.findOne({
      _id: params.id,
      restaurantId: user.restaurantId
    }).lean();

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow template' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('workflows:templates', 'update')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      tasks,
      recurring,
      assignmentType,
      assignedUsers,
      assignedRole,
      category,
      color,
      isActive
    } = body;

    const template = await WorkflowTemplate.findOneAndUpdate(
      {
        _id: params.id,
        restaurantId: user.restaurantId
      },
      {
        $set: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(tasks && { tasks }),
          ...(recurring && { recurring }),
          ...(assignmentType && { assignmentType }),
          ...(assignedUsers !== undefined && { assignedUsers }),
          ...(assignedRole !== undefined && { assignedRole }),
          ...(category !== undefined && { category }),
          ...(color !== undefined && { color }),
          ...(isActive !== undefined && { isActive })
        }
      },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authorize('workflows:templates', 'delete')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    // Soft delete by marking as inactive
    const template = await WorkflowTemplate.findOneAndUpdate(
      {
        _id: params.id,
        restaurantId: user.restaurantId
      },
      {
        $set: { isActive: false }
      },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    console.error('Error deleting workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow template' },
      { status: 500 }
    );
  }
}
