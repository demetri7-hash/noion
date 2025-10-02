import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { DiscoveryReport } from '@/services/DiscoveryReport';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * POST /api/reports/[restaurantId]/discovery
 * Generate free discovery report
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.restaurantId !== params.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const discoveryService = new DiscoveryReport();
    const report = await discoveryService.generateDiscoveryReport(params.restaurantId);

    return NextResponse.json({
      success: true,
      message: 'Discovery report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Discovery report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
