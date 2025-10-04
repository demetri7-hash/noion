import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Transaction, Restaurant } from '@/models';
import mongoose from 'mongoose';
import { find as findTimezone } from 'geo-tz';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/today/[restaurantId]
 * Get today's metrics vs yesterday for owner war room
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    await connectDB();

    const { restaurantId } = params;
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

    // Get restaurant to determine timezone from location
    const restaurant = await Restaurant.findById(restaurantObjectId);

    let timezone = 'America/Los_Angeles'; // Default to Pacific Time

    if (restaurant?.location?.latitude && restaurant?.location?.longitude) {
      try {
        const timezones = findTimezone(restaurant.location.latitude, restaurant.location.longitude);
        if (timezones && timezones.length > 0) {
          timezone = timezones[0];
        }
      } catch (error) {
        console.error('Timezone detection error:', error);
      }
    }

    // Get current time in restaurant's timezone
    const now = new Date();
    const nowInRestaurantTZ = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    // Today's date range (midnight to now in restaurant timezone)
    const todayStart = new Date(nowInRestaurantTZ);
    todayStart.setHours(0, 0, 0, 0);

    // Convert back to UTC for database query
    const todayStartUTC = new Date(todayStart.toLocaleString('en-US', { timeZone: 'UTC' }));
    const todayEndUTC = now;

    // Yesterday's date range (midnight to same time yesterday in restaurant timezone)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayStartUTC = new Date(yesterdayStart.toLocaleString('en-US', { timeZone: 'UTC' }));

    const yesterdayEnd = new Date(nowInRestaurantTZ);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    const yesterdayEndUTC = new Date(yesterdayEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Fetch today's transactions (using UTC dates for query)
    const todayTransactions = await Transaction.find({
      restaurantId: restaurantObjectId,
      transactionDate: { $gte: todayStartUTC, $lte: todayEndUTC },
      status: { $ne: 'voided' }
    }).lean();

    // Fetch yesterday's transactions (same time window)
    const yesterdayTransactions = await Transaction.find({
      restaurantId: restaurantObjectId,
      transactionDate: { $gte: yesterdayStartUTC, $lte: yesterdayEndUTC },
      status: { $ne: 'voided' }
    }).lean();

    // Calculate today's metrics
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const todayCount = todayTransactions.length;
    const todayAvgTicket = todayCount > 0 ? todayRevenue / todayCount : 0;

    // Calculate yesterday's metrics
    const yesterdayRevenue = yesterdayTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const yesterdayCount = yesterdayTransactions.length;
    const yesterdayAvgTicket = yesterdayCount > 0 ? yesterdayRevenue / yesterdayCount : 0;

    // Calculate changes
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;
    const transactionsChange = yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : 0;
    const avgTicketChange = yesterdayAvgTicket > 0
      ? ((todayAvgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100
      : 0;

    // Find peak hour today
    const hourlyRevenue: { [hour: number]: number } = {};
    todayTransactions.forEach(t => {
      if (t.analytics?.hourOfDay !== undefined) {
        const hour = t.analytics.hourOfDay;
        hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (t.totalAmount || 0);
      }
    });

    let peakHour = 12; // default noon
    let peakRevenue = 0;
    Object.entries(hourlyRevenue).forEach(([hour, revenue]) => {
      if (revenue > peakRevenue) {
        peakRevenue = revenue;
        peakHour = parseInt(hour);
      }
    });

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${period}`;
    };

    // Calculate top staff performance for today
    const staffPerformance: { [staffId: string]: any } = {};

    // Build a map of Toast employee IDs to imported staff
    const staffMap = new Map();
    if (restaurant?.team?.employees) {
      restaurant.team.employees.forEach((emp: any) => {
        if (emp.toastEmployeeId) {
          staffMap.set(emp.toastEmployeeId, emp);
        }
      });
    }

    todayTransactions.forEach(t => {
      // Skip transactions with no employee attribution (invoices, system orders, etc.)
      if (t.employee?.id && t.employee.id !== 'unknown' && t.employee.id !== 'unassigned') {
        const toastEmployeeId = t.employee.id;
        if (!staffPerformance[toastEmployeeId]) {
          // Look up imported staff data
          const importedStaff = staffMap.get(toastEmployeeId);

          staffPerformance[toastEmployeeId] = {
            id: toastEmployeeId,
            name: importedStaff
              ? `${importedStaff.firstName} ${importedStaff.lastName}`
              : (t.employee.name || 'Unknown'),
            email: importedStaff?.email || null,
            role: importedStaff?.role || 'employee',
            isImported: !!importedStaff,
            sales: 0,
            transactions: 0,
            avgTicket: 0,
            hoursWorked: 0, // TODO: Calculate from shift data
            // Gamification data if imported
            points: importedStaff?.points || 0,
            level: importedStaff?.level || 1
          };
        }
        staffPerformance[toastEmployeeId].sales += t.totalAmount || 0;
        staffPerformance[toastEmployeeId].transactions += 1;
      }
    });

    // Calculate averages and sort
    const topStaff = Object.values(staffPerformance)
      .map((staff: any) => ({
        ...staff,
        avgTicket: staff.transactions > 0 ? staff.sales / staff.transactions : 0
      }))
      .sort((a, b) => b.sales - a.sales);

    const metrics = {
      revenue: {
        current: todayRevenue,
        yesterday: yesterdayRevenue,
        change: revenueChange
      },
      transactions: {
        current: todayCount,
        yesterday: yesterdayCount,
        change: transactionsChange
      },
      avgTicket: {
        current: todayAvgTicket,
        yesterday: yesterdayAvgTicket,
        change: avgTicketChange
      },
      peakHour: {
        hour: formatHour(peakHour),
        revenue: peakRevenue
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        topStaff,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Today dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load today\'s data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
