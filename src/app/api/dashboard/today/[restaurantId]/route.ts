import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/models';
import mongoose from 'mongoose';

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

    // Today's date range (midnight to now)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = now;

    // Yesterday's date range (midnight to same time yesterday)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Fetch today's transactions
    const todayTransactions = await Transaction.find({
      restaurantId: restaurantObjectId,
      transactionDate: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: 'voided' }
    }).lean();

    // Fetch yesterday's transactions (same time window)
    const yesterdayTransactions = await Transaction.find({
      restaurantId: restaurantObjectId,
      transactionDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
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

    todayTransactions.forEach(t => {
      if (t.employee?.id) {
        const staffId = t.employee.id;
        if (!staffPerformance[staffId]) {
          staffPerformance[staffId] = {
            id: staffId,
            name: t.employee.name || 'Unknown',
            sales: 0,
            transactions: 0,
            avgTicket: 0,
            hoursWorked: 0 // TODO: Calculate from shift data
          };
        }
        staffPerformance[staffId].sales += t.totalAmount || 0;
        staffPerformance[staffId].transactions += 1;
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
