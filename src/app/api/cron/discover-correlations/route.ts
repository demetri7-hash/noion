import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Restaurant from '../../../../models/Restaurant';
import { correlationEngine } from '../../../../services/CorrelationEngine';

export const dynamic = 'force-dynamic';

/**
 * Cron Job: Nightly Correlation Discovery
 * Runs daily at 2 AM (configured in vercel.json)
 *
 * Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== Starting Nightly Correlation Discovery ===');
    const startTime = Date.now();

    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    // Get all active restaurants
    const restaurants = await Restaurant.find({
      'posConfig.isConnected': true
    });

    console.log(`Found ${restaurants.length} active restaurants`);

    // Date range: last 90 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    let results = {
      processed: 0,
      totalCorrelations: 0,
      totalNewPatterns: 0,
      totalValidated: 0,
      totalInvalidated: 0,
      errors: 0
    };

    // Process each restaurant
    for (const restaurant of restaurants) {
      try {
        const restaurantId = String(restaurant._id);
        console.log(`Processing ${restaurant.name}...`);

        const result = await correlationEngine.discoverCorrelations(
          restaurantId,
          startDate,
          endDate
        );

        // Contribute to global learning
        await correlationEngine.contributeToGlobalLearning(restaurantId);

        results.processed++;
        results.totalCorrelations += result.correlations.length;
        results.totalNewPatterns += result.newPatternsFound;
        results.totalValidated += result.patternsValidated;
        results.totalInvalidated += result.patternsInvalidated;

      } catch (error: any) {
        console.error(`Error processing ${restaurant.name}:`, error.message);
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Job complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Correlation discovery completed',
      results,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}
