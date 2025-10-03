/**
 * Single Task API
 * GET /api/v2/tasks/[id] - Get task details
 * PUT /api/v2/tasks/[id] - Update/complete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Task, Workflow, AuditLog, Restaurant } from '@/models';
import connectDB from '@/lib/mongodb';
import { calculateTaskPoints, awardPoints, updateStreak } from '@/lib/points';
import { checkBadges } from '@/lib/badges';

export const runtime = 'nodejs';

/**
 * GET - Get task details
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

    // Employees can only see their own tasks
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    }

    const task = await Task.findOne(query).lean();

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update/complete task
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
    const { status, notes, photoUrl, signatureUrl, skipReason } = body;

    const query: any = {
      _id: params.id,
      restaurantId: user.restaurantId
    };

    // Employees can only update their own tasks
    if (user.role === 'employee') {
      query.assignedTo = user.userId;
    }

    const task = await Task.findOne(query);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is editable (before midnight of completion day)
    const workflow = await Workflow.findById(task.workflowId);
    if (workflow && workflow.editableUntil && new Date() > workflow.editableUntil) {
      return NextResponse.json(
        { error: 'Task is no longer editable (past end of day)' },
        { status: 403 }
      );
    }

    // Validate required fields for completion
    if (status === 'completed') {
      if (task.requiresPhoto && !photoUrl && !task.photoUrl) {
        return NextResponse.json(
          { error: 'Photo is required for this task' },
          { status: 400 }
        );
      }
      if (task.requiresSignature && !signatureUrl && !task.signatureUrl) {
        return NextResponse.json(
          { error: 'Signature is required for this task' },
          { status: 400 }
        );
      }
      if (task.requiresNotes && !notes && !task.notes) {
        return NextResponse.json(
          { error: 'Notes are required for this task' },
          { status: 400 }
        );
      }
    }

    // Track changes for audit log
    const changes: any = {};
    const oldValues: any = {
      status: task.status,
      notes: task.notes,
      photoUrl: task.photoUrl,
      signatureUrl: task.signatureUrl
    };

    // Update task
    const updateData: any = {};

    if (status && status !== task.status) {
      updateData.status = status;
      changes.status = { old: task.status, new: status };

      if (status === 'completed') {
        updateData.completedAt = new Date();

        if (!task.startedAt) {
          updateData.startedAt = new Date();
        } else {
          const completionTime = (new Date().getTime() - task.startedAt.getTime()) / (1000 * 60);
          updateData.completionTime = Math.round(completionTime);
        }
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
      changes.notes = { old: task.notes, new: notes };
    }

    if (photoUrl) {
      updateData.photoUrl = photoUrl;
      changes.photoUrl = { old: task.photoUrl, new: photoUrl };
    }

    if (signatureUrl) {
      updateData.signatureUrl = signatureUrl;
      changes.signatureUrl = { old: task.signatureUrl, new: signatureUrl };
    }

    // Add to edit history if this is an edit (not first completion)
    if (Object.keys(changes).length > 0 && task.completedAt) {
      updateData.$push = {
        editHistory: Object.entries(changes).map(([field, change]: [string, any]) => ({
          field,
          oldValue: String(change.old || ''),
          newValue: String(change.new || ''),
          editedBy: user.userId,
          editedAt: new Date()
        }))
      };
    }

    const updatedTask = await Task.findOneAndUpdate(
      query,
      updateData.$push ? updateData : { $set: updateData },
      { new: true }
    );

    // Update workflow completion count and award points
    if (status === 'completed' && task.status !== 'completed') {
      await Workflow.findByIdAndUpdate(task.workflowId, {
        $inc: {
          completedTasks: 1,
          pointsAwarded: task.points
        }
      });

      // Check if workflow is complete
      const updatedWorkflow = await Workflow.findById(task.workflowId);
      if (updatedWorkflow && updatedWorkflow.completedTasks >= updatedWorkflow.totalTasks) {
        updatedWorkflow.status = 'completed';
        updatedWorkflow.completedAt = new Date();

        // Set editable until midnight
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);
        updatedWorkflow.editableUntil = midnight;

        await updatedWorkflow.save();
      }

      // Award points for task completion
      try {
        // Get user's current streak
        const restaurant = await Restaurant.findOne({
          _id: user.restaurantId,
          'owner.userId': user.userId
        });
        const streak = restaurant?.owner.streak || 0;

        // Calculate points with bonuses
        const pointsCalc = await calculateTaskPoints({
          task: updatedTask,
          completedAt: new Date(),
          dueDate: workflow?.dueDate,
          hasPhoto: !!updatedTask?.photoUrl,
          hasSignature: !!updatedTask?.signatureUrl,
          streak
        });

        // Award points to user
        await awardPoints({
          userId: user.userId,
          restaurantId: user.restaurantId,
          calculation: pointsCalc,
          entityType: 'task',
          entityId: updatedTask?._id?.toString() || params.id
        });

        // Update streak
        await updateStreak(user.userId, user.restaurantId);

        // Check for badge unlocks
        const newBadges = await checkBadges(user.userId, user.restaurantId);

        // TODO: Send notifications for new badges
        if (newBadges.length > 0) {
          console.log(`User ${user.userId} unlocked ${newBadges.length} new badges!`);
        }
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
        // Don't fail the task completion if points fail
      }
    }

    // Create audit log
    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        restaurantId: user.restaurantId,
        entityType: 'task',
        entityId: task._id,
        userId: user.userId,
        action: status === 'completed' ? 'complete' : 'update',
        changes
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
