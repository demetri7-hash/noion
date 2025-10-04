import { NextRequest, NextResponse } from 'next/server';
import { correlationEngine } from '../../../../services/CorrelationEngine';
import { locationService } from '../../../../services/LocationService';
import { weatherService, eventsService, holidayService } from '../../../../services/ExternalDataService';
import { verifyToken } from '../../../../lib/auth';
import Restaurant from '../../../../models/Restaurant';

/**
 * GET /api/analytics/predictions
 * Get predictions for upcoming dates based on learned patterns
 *
 * Query params:
 * - date: ISO date string (default: tomorrow)
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
    const dateParam = searchParams.get('date');

    // Default to tomorrow
    const predictionDate = dateParam ? new Date(dateParam) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Get restaurant location
    const location = await locationService.getRestaurantLocation(restaurantId);
    if (!location) {
      return NextResponse.json(
        { error: 'Could not determine restaurant location' },
        { status: 400 }
      );
    }

    // Get restaurant info
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get external factors for prediction date
    const weather = await weatherService.getCurrentWeather(
      location.latitude,
      location.longitude
    );

    const events = await eventsService.getLocalEvents(
      location.latitude,
      location.longitude,
      5, // 5 mile radius
      predictionDate,
      new Date(predictionDate.getTime() + 24 * 60 * 60 * 1000) // Same day
    );

    const holiday = holidayService.getHoliday(predictionDate);

    // Make predictions
    const predictions = await correlationEngine.predict({
      restaurantId,
      date: predictionDate,
      weather: weather || undefined,
      events: events.length > 0 ? events : undefined,
      holiday: holiday || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        predictionDate,
        predictions,
        externalFactors: {
          weather,
          events: events.slice(0, 5), // Top 5 events
          holiday
        }
      }
    });

  } catch (error: any) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
