/**
 * Test Enhanced Analytics System
 *
 * Tests all external services and correlation engine
 * Run with: npx ts-node scripts/test-enhanced-analytics.ts
 */

import mongoose from 'mongoose';
import { weatherService, eventsService, holidayService } from '../src/services/ExternalDataService';
import { locationService } from '../src/services/LocationService';
import { correlationEngine } from '../src/services/CorrelationEngine';
import { menuAnalyticsService } from '../src/services/MenuAnalyticsService';
import { enhancedInsightsService } from '../src/services/EnhancedInsightsService';
import Restaurant from '../src/models/Restaurant';

async function testEnhancedAnalytics() {
  try {
    console.log('=== Testing Enhanced Analytics System ===\n');

    // Connect to MongoDB
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }

    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✓ Connected to MongoDB\n');

    // Get test restaurant
    const restaurant = await Restaurant.findOne({ 'owner.email': 'test@example.com' });
    if (!restaurant) {
      throw new Error('Test restaurant not found');
    }

    const restaurantId = String(restaurant._id);
    console.log(`✓ Found test restaurant: ${restaurant.name} (${restaurantId})\n`);

    // Test 1: Location Service
    console.log('--- Test 1: Location Service ---');
    const location = await locationService.getRestaurantLocation(restaurantId);
    if (location) {
      console.log(`✓ Location found: ${location.city}, ${location.state}`);
      console.log(`  Coordinates: ${location.latitude}, ${location.longitude}`);
      console.log(`  Source: ${location.source}\n`);
    } else {
      console.log('✗ Could not determine location\n');
      return;
    }

    // Test 2: Weather Service
    console.log('--- Test 2: Weather Service ---');
    const currentWeather = await weatherService.getCurrentWeather(
      location.latitude,
      location.longitude
    );
    if (currentWeather) {
      console.log(`✓ Current weather: ${currentWeather.description}`);
      console.log(`  Temperature: ${currentWeather.temperature.toFixed(1)}°F`);
      console.log(`  Category: ${currentWeather.weatherCategory}`);
      console.log(`  Raining: ${currentWeather.isRaining}\n`);
    } else {
      console.log('✗ Could not fetch weather\n');
    }

    const forecast = await weatherService.getWeatherForecast(
      location.latitude,
      location.longitude,
      3
    );
    console.log(`✓ Fetched ${forecast.length} day forecast\n`);

    // Test 3: Events Service
    console.log('--- Test 3: Events Service ---');
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await eventsService.getLocalEvents(
      location.latitude,
      location.longitude,
      10, // 10 mile radius
      now,
      oneWeekLater
    );
    console.log(`✓ Found ${events.length} upcoming events`);
    if (events.length > 0) {
      const topEvent = events[0];
      console.log(`  Top event: ${topEvent.name}`);
      console.log(`  Date: ${topEvent.startDate.toLocaleDateString()}`);
      console.log(`  Distance: ${topEvent.distance.toFixed(1)} miles`);
      console.log(`  Expected attendance: ${topEvent.expectedAttendance.toLocaleString()}`);
      console.log(`  Impact level: ${topEvent.impactLevel}\n`);
    } else {
      console.log('  No events found in this period\n');
    }

    // Test 4: Holiday Service
    console.log('--- Test 4: Holiday Service ---');
    const todayHoliday = holidayService.getHoliday(new Date());
    if (todayHoliday) {
      console.log(`✓ Today is ${todayHoliday.name}`);
      console.log(`  Dining impact: ${todayHoliday.diningImpact}\n`);
    } else {
      console.log('  Today is not a holiday\n');
    }

    const upcomingHolidays = holidayService.getUpcomingHolidays(3);
    console.log(`✓ Next 3 holidays:`);
    upcomingHolidays.forEach(h => {
      console.log(`  - ${h.name} (${h.date.toLocaleDateString()}) - ${h.diningImpact} impact`);
    });
    console.log();

    // Test 5: Correlation Discovery
    console.log('--- Test 5: Correlation Discovery ---');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    try {
      const correlationResult = await correlationEngine.discoverCorrelations(
        restaurantId,
        startDate,
        endDate
      );
      console.log(`✓ Correlation discovery complete`);
      console.log(`  Correlations found: ${correlationResult.correlations.length}`);
      console.log(`  New patterns: ${correlationResult.newPatternsFound}`);
      console.log(`  Patterns validated: ${correlationResult.patternsValidated}`);
      console.log(`  Patterns invalidated: ${correlationResult.patternsInvalidated}\n`);

      if (correlationResult.correlations.length > 0) {
        const topCorrelation = correlationResult.correlations[0];
        console.log(`  Top pattern: ${topCorrelation.pattern.description}`);
        console.log(`  Confidence: ${topCorrelation.statistics.confidence}%`);
        console.log(`  Correlation: ${topCorrelation.statistics.correlation.toFixed(3)}\n`);
      }
    } catch (error: any) {
      console.log(`  No transaction data available for correlation analysis\n`);
    }

    // Test 6: Menu Analytics
    console.log('--- Test 6: Menu Analytics ---');
    try {
      const menuInsights = await menuAnalyticsService.analyzeMenu(
        restaurantId,
        new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate
      );
      console.log(`✓ Menu analysis complete`);
      console.log(`  Top items: ${menuInsights.topItems.length}`);
      console.log(`  Upsell opportunities: ${menuInsights.upsellOpportunities.length}`);
      console.log(`  Bundle opportunities: ${menuInsights.bundleOpportunities.length}\n`);

      if (menuInsights.upsellOpportunities.length > 0) {
        const topUpsell = menuInsights.upsellOpportunities[0];
        console.log(`  Top upsell: ${topUpsell.baseItem.name} → ${topUpsell.suggestedItem.name}`);
        console.log(`  Attach rate: ${(topUpsell.pattern.attachRate * 100).toFixed(1)}%`);
        console.log(`  Missed revenue: $${topUpsell.revenueImpact.missedMonthly.toFixed(0)}/month\n`);
      }
    } catch (error: any) {
      console.log(`  ${error.message}\n`);
    }

    // Test 7: Predictions
    console.log('--- Test 7: Predictions ---');
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const predictions = await correlationEngine.predict({
        restaurantId,
        date: tomorrow,
        weather: currentWeather || undefined,
        events: events.length > 0 ? events.slice(0, 3) : undefined
      });

      console.log(`✓ Generated ${predictions.length} predictions for tomorrow`);
      predictions.forEach(pred => {
        console.log(`  ${pred.metric}: ${pred.change > 0 ? '+' : ''}${pred.change.toFixed(1)}%`);
        console.log(`    Confidence: ${pred.confidence}%`);
        console.log(`    Factors: ${pred.factors.map(f => f.type).join(', ')}`);
      });
      console.log();
    } catch (error: any) {
      console.log(`  ${error.message}\n`);
    }

    // Test 8: Enhanced Insights (Full Integration)
    console.log('--- Test 8: Enhanced Insights (Full Integration) ---');
    try {
      const enhancedInsights = await enhancedInsightsService.generateEnhancedInsights(
        restaurantId,
        new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate
      );

      console.log(`✓ Enhanced insights generated`);
      console.log(`  Key findings: ${enhancedInsights.findings.length}`);
      console.log(`  Recommendations: ${enhancedInsights.recommendations.length}`);
      console.log(`  Predictions: ${enhancedInsights.predictions.length}`);
      console.log(`  Learned patterns: ${enhancedInsights.patterns.length}\n`);

      if (enhancedInsights.contextualFactors.weather) {
        console.log(`  Weather impact: ${enhancedInsights.contextualFactors.weather.impact}`);
      }
      if (enhancedInsights.contextualFactors.upcomingEvents && enhancedInsights.contextualFactors.upcomingEvents.length > 0) {
        console.log(`  ${enhancedInsights.contextualFactors.upcomingEvents.length} high-impact events detected`);
      }
      console.log();
    } catch (error: any) {
      console.log(`  ${error.message}\n`);
    }

    console.log('=== All Tests Complete ===\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Test failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run tests
testEnhancedAnalytics();
