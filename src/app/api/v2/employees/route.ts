/**
 * Employees API
 * GET /api/v2/employees - List restaurant employees/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Restaurant } from '@/models';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - List employees
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('team', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active' or 'all'

    const restaurant = await Restaurant.findById(user.restaurantId).lean();

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get employees from team.employees and include owner
    let employees: any[] = [];

    // Add owner as first employee
    if (restaurant.owner) {
      employees.push({
        _id: restaurant.owner.userId || restaurant._id.toString(),
        name: `${restaurant.owner.firstName} ${restaurant.owner.lastName}`.trim(),
        email: restaurant.owner.email,
        role: restaurant.owner.role || 'owner',
        isActive: restaurant.owner.isActive !== false,
        hireDate: restaurant.owner.hireDate,
        points: restaurant.owner.points || 0,
        level: restaurant.owner.level || 1
      });
    }

    // Add team employees
    if (restaurant.team?.employees) {
      const teamEmployees = restaurant.team.employees.map((emp: any) => ({
        _id: emp.userId || emp._id?.toString(),
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.email,
        role: emp.role,
        isActive: emp.isActive !== false,
        hireDate: emp.importedAt,
        points: emp.points || 0,
        level: emp.level || 1
      }));
      employees = employees.concat(teamEmployees);
    }

    // Filter by active status if requested
    if (status === 'active') {
      employees = employees.filter((emp: any) => emp.isActive !== false);
    }

    return NextResponse.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
