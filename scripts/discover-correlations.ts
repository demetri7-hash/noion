/**
 * Nightly Correlation Discovery Job
 *
 * This script should run daily to:
 * 1. Discover new patterns from transaction data
 * 2. Validate existing patterns
 * 3. Contribute to global learning
 *
 * Run with: npx ts-node scripts/discover-correlations.ts
 * Or set up as a cron job in Vercel/Railway
 */

import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';
import { correlationEngine } from '../src/services/CorrelationEngine';

async function discoverCorrelationsForAllRestaurants() {
  try {
    console.log('=== Starting Correlation Discovery Job ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Connect to MongoDB
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }

    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✓ Connected to MongoDB');

    // Get all active restaurants
    const restaurants = await Restaurant.find({
      'posConfig.isConnected': true
    });

    console.log(`✓ Found ${restaurants.length} active restaurants`);

    // Date range: last 90 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    console.log(`Analyzing period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    let totalResults = {
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
        console.log(`\n--- Processing ${restaurant.name} (${restaurantId}) ---`);

        // Discover correlations
        const result = await correlationEngine.discoverCorrelations(
          restaurantId,
          startDate,
          endDate
        );

        console.log(`  Correlations found: ${result.correlations.length}`);
        console.log(`  New patterns: ${result.newPatternsFound}`);
        console.log(`  Patterns validated: ${result.patternsValidated}`);
        console.log(`  Patterns invalidated: ${result.patternsInvalidated}`);

        // Contribute to global learning
        await correlationEngine.contributeToGlobalLearning(restaurantId);
        console.log(`  ✓ Contributed to global learning`);

        // Update totals
        totalResults.totalCorrelations += result.correlations.length;
        totalResults.totalNewPatterns += result.newPatternsFound;
        totalResults.totalValidated += result.patternsValidated;
        totalResults.totalInvalidated += result.patternsInvalidated;

      } catch (error: any) {
        console.error(`  ✗ Error processing restaurant ${restaurant.name}:`, error.message);
        totalResults.errors++;
      }
    }

    // Summary
    console.log('\n=== Job Complete ===');
    console.log(`Restaurants processed: ${restaurants.length}`);
    console.log(`Total correlations: ${totalResults.totalCorrelations}`);
    console.log(`New patterns discovered: ${totalResults.totalNewPatterns}`);
    console.log(`Patterns validated: ${totalResults.totalValidated}`);
    console.log(`Patterns invalidated: ${totalResults.totalInvalidated}`);
    console.log(`Errors: ${totalResults.errors}`);
    console.log(`Duration: ${Date.now() - startDate.getTime()}ms`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Fatal error in correlation discovery job:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the job
discoverCorrelationsForAllRestaurants();
