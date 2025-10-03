import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Transaction, Insight, Restaurant } from '@/models';

/**
 * GET /api/dashboard/[restaurantId]
 * Get dashboard metrics and insights for a restaurant
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    await connectDB();

    const { restaurantId } = params;

    console.log('Dashboard API called for restaurant:', restaurantId);

    // Handle test restaurant ID with mock data for development
    if (restaurantId === 'test-restaurant-id') {
      console.log('Test restaurant ID detected, returning mock data for development');
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            totalRevenue: {
              current: 52340,
              previous: 47890,
              change: 9.3
            },
            customerCount: {
              current: 1423,
              previous: 1298,
              change: 9.6
            },
            averageTicket: {
              current: 36.78,
              previous: 36.90,
              change: -0.3
            },
            peakHours: {
              start: '6:00 PM',
              end: '8:00 PM',
              revenue: 18920
            }
          },
          insights: [
            {
              id: '1',
              title: '🎯 Peak Hour Staffing Opportunity',
              description: 'Adding one server during Friday dinner rush (6-9 PM) could serve 25% more customers and increase revenue by $2,100/month',
              impact: 2100,
              category: 'revenue_optimization',
              priority: 'high',
              status: 'new'
            },
            {
              id: '2',
              title: '💰 Upselling Training Impact',
              description: 'Systematic appetizer upselling during peak hours could boost revenue by $1,450/month with minimal effort',
              impact: 1450,
              category: 'revenue_optimization',
              priority: 'high',
              status: 'new'
            },
            {
              id: '3',
              title: '📊 Menu Item Repositioning',
              description: 'Moving high-margin pasta dishes to premium section could increase profits by $890/month',
              impact: 890,
              category: 'menu_optimization',
              priority: 'medium',
              status: 'new'
            }
          ],
          transactionCount: 1423,
          hasData: true,
          isDemoData: true
        }
      });
    }

    if (!restaurantId) {
      console.log('No restaurant ID provided');
      return NextResponse.json({
        success: true,
        data: {
          metrics: null,
          insights: [],
          transactionCount: 0,
          hasData: false,
          message: 'Please connect your POS system to view dashboard data'
        }
      });
    }

    // Fetch restaurant to get timezone
    const restaurant = await Restaurant.findById(restaurantId);
    const timezone = restaurant?.analyticsSettings?.timezone || 'America/Los_Angeles';

    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    // Fetch current period transactions
    const currentTransactions = await Transaction.find({
      restaurantId: restaurantId,
      transactionDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'voided' }
    });

    // Fetch previous period transactions
    const previousTransactions = await Transaction.find({
      restaurantId: restaurantId,
      transactionDate: { $gte: previousStartDate, $lte: previousEndDate },
      status: { $ne: 'voided' }
    });

    // Calculate current metrics
    const currentRevenue = currentTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const currentCustomers = currentTransactions.length;
    const currentAvgTicket = currentCustomers > 0 ? currentRevenue / currentCustomers : 0;

    // Calculate previous metrics
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const previousCustomers = previousTransactions.length;
    const previousAvgTicket = previousCustomers > 0 ? previousRevenue / previousCustomers : 0;

    // Calculate changes (only if sufficient historical data)
    // If previous period has less than 20% of current period data, comparisons are misleading
    const hasValidComparison = previousCustomers >= currentCustomers * 0.2;

    const revenueChange = hasValidComparison && previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : null;
    const customerChange = hasValidComparison && previousCustomers > 0
      ? ((currentCustomers - previousCustomers) / previousCustomers) * 100
      : null;
    const avgTicketChange = hasValidComparison && previousAvgTicket > 0
      ? ((currentAvgTicket - previousAvgTicket) / previousAvgTicket) * 100
      : null;

    // Calculate peak hours using stored UTC hourOfDay
    const hourlyRevenue: { [hour: number]: number } = {};
    currentTransactions.forEach(t => {
      if (t.analytics?.hourOfDay !== undefined) {
        const hour = t.analytics.hourOfDay;
        hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (t.totalAmount || 0);
      }
    });

    let peakHour = 18; // default 6 PM
    let peakRevenue = 0;
    Object.entries(hourlyRevenue).forEach(([hour, revenue]) => {
      if (revenue > peakRevenue) {
        peakRevenue = revenue;
        peakHour = parseInt(hour);
      }
    });

    // Helper function to convert UTC hour to restaurant's local timezone
    const convertUTCToLocal = (utcHour: number): number => {
      // Create a date object in UTC
      const now = new Date();
      const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));

      // Convert to restaurant timezone using Intl
      const localTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone
      }).format(utcDate);

      return parseInt(localTime);
    };

    const formatHour = (utcHour: number) => {
      const localHour = convertUTCToLocal(utcHour);
      const period = localHour >= 12 ? 'PM' : 'AM';
      const displayHour = localHour > 12 ? localHour - 12 : localHour === 0 ? 12 : localHour;
      return `${displayHour}:00 ${period}`;
    };

    // Fetch insights
    const insights = await Insight.find({
      restaurantId: restaurantId,
      status: { $in: ['generated', 'sent', 'viewed'] }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Format insights for dashboard
    const formattedInsights = insights.map(insight => ({
      id: String(insight._id),
      title: insight.title,
      description: insight.summary,
      impact: insight.lostRevenue?.total || 0,
      category: insight.type,
      priority: insight.priority || 'medium',
      status: insight.status || 'new'
    }));

    const metrics = {
      totalRevenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange
      },
      customerCount: {
        current: currentCustomers,
        previous: previousCustomers,
        change: customerChange
      },
      averageTicket: {
        current: currentAvgTicket,
        previous: previousAvgTicket,
        change: avgTicketChange
      },
      peakHours: {
        start: formatHour(peakHour),
        end: formatHour((peakHour + 2) % 24),
        revenue: peakRevenue
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        insights: formattedInsights,
        transactionCount: currentCustomers,
        hasData: currentCustomers > 0
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
