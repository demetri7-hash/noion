/**
 * Workflow Templates API
 * GET /api/v2/workflows/templates - List all templates
 * POST /api/v2/workflows/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { WorkflowTemplate } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - List workflow templates
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('workflows:templates', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const category = searchParams.get('category');

    const query: any = {
      restaurantId: user.restaurantId,
    };

    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    if (category) {
      query.category = category;
    }

    const templates = await WorkflowTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create workflow template
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('workflows:templates', 'create')(request);
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
      color
    } = body;

    if (!name || !tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'name and tasks are required' },
        { status: 400 }
      );
    }

    const template = await WorkflowTemplate.create({
      name,
      description,
      restaurantId: user.restaurantId,
      createdBy: user.userId,
      tasks,
      recurring: recurring || { enabled: false },
      assignmentType,
      assignedUsers,
      assignedRole,
      category,
      color,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow template' },
      { status: 500 }
    );
  }
}
