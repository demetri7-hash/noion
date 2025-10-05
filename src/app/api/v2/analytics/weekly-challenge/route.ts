import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { generateWeeklyChallenge, formatChallengeForTeam } from '@/lib/analytics/weeklyChallengeGenerator';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v2/analytics/weekly-challenge
 * Generate weekly upsell challenge for team
 *
 * Query params:
 * - format: 'json' | 'text' (default: json)
 * - weekStart: ISO date string (optional, defaults to next Monday)
 *
 * Available to managers and owners
 */
export async function GET(request: NextRequest) {
  // Require manager or owner permissions
  const authResult = await authorize('analytics:team', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const weekStartParam = searchParams.get('weekStart');

    let weekStart: Date | undefined;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
      if (isNaN(weekStart.getTime())) {
        return NextResponse.json(
          { error: 'Invalid weekStart date format' },
          { status: 400 }
        );
      }
    }

    // Generate challenge
    const challenge = await generateWeeklyChallenge(user.restaurantId, weekStart);

    // Return based on requested format
    if (format === 'text') {
      const textFormat = formatChallengeForTeam(challenge);
      return new NextResponse(textFormat, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: challenge,
      textFormat: formatChallengeForTeam(challenge) // Include text format in JSON response too
    });

  } catch (error) {
    console.error('Weekly challenge generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate weekly challenge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
