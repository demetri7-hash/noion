import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import Correlation from '../../../../models/Correlation';
import Restaurant from '../../../../models/Restaurant';
import { locationService } from '../../../../services/LocationService';

/**
 * GET /api/analytics/correlations
 * Get discovered correlations/patterns for a restaurant
 * Includes restaurant-specific, regional, and global patterns
 *
 * Query params:
 * - scope: 'all' | 'restaurant' | 'regional' | 'global' (default: 'all')
 * - minConfidence: number (0-100, default: 50)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const restaurantId = decoded.restaurantId;

    // Get query params
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'all';
    const minConfidence = parseInt(searchParams.get('minConfidence') || '50');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get restaurant info for regional patterns
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const location = await locationService.getRestaurantLocation(restaurantId);
    const region = location ? locationService.getRegion(location.state) : 'unknown';
    const cuisineType = restaurant.type || 'casual_dining';

    // Build query based on scope
    let patterns;
    if (scope === 'restaurant') {
      patterns = await Correlation.find({
        restaurantId,
        'statistics.confidence': { $gte: minConfidence }
      })
        .sort({ 'statistics.confidence': -1 })
        .limit(limit);
    } else if (scope === 'regional') {
      patterns = await Correlation.find({
        scope: 'regional',
        region,
        'statistics.confidence': { $gte: minConfidence }
      })
        .sort({ 'statistics.confidence': -1 })
        .limit(limit);
    } else if (scope === 'global') {
      patterns = await Correlation.find({
        scope: 'global',
        'statistics.confidence': { $gte: minConfidence }
      })
        .sort({ 'statistics.confidence': -1 })
        .limit(limit);
    } else {
      // Get all patterns relevant to this restaurant
      patterns = await Correlation.findForRestaurant(
        restaurantId,
        region,
        cuisineType
      );
      patterns = patterns
        .filter((p: any) => p.statistics.confidence >= minConfidence)
        .slice(0, limit);
    }

    // Group by type
    const grouped = {
      weather: patterns.filter((p: any) => p.type === 'weather_sales' || p.type === 'weather_traffic'),
      events: patterns.filter((p: any) => p.type === 'event_sales' || p.type === 'event_traffic'),
      holidays: patterns.filter((p: any) => p.type === 'holiday_sales' || p.type === 'holiday_traffic'),
      temporal: patterns.filter((p: any) => p.type === 'time_sales' || p.type === 'day_of_week')
    };

    return NextResponse.json({
      success: true,
      data: {
        total: patterns.length,
        patterns,
        grouped,
        metadata: {
          restaurantId,
          region,
          cuisineType,
          scope,
          minConfidence
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching correlations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch correlations' },
      { status: 500 }
    );
  }
}
