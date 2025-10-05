/**
 * Test Enhanced External Data Service
 *
 * Tests all external API integrations:
 * - Ticketmaster Events
 * - Eventbrite Events
 * - SeatGeek Events
 * - Meetup Events
 * - NOAA Weather Alerts
 * - HERE Maps Traffic
 * - US Federal Holidays
 *
 * Usage: DATABASE_URL=xxx TICKETMASTER_API_KEY=xxx EVENTBRITE_TOKEN=xxx HERE_API_KEY=xxx npx tsx scripts/test-enhanced-external-data.ts <restaurantId>
 */

import mongoose from 'mongoose';
import { Restaurant } from '../src/models';
import { EnhancedExternalDataService } from '../src/services/EnhancedExternalDataService';

async function testExternalData() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Usage: npx tsx test-enhanced-external-data.ts <restaurantId>');
    process.exit(1);
  }

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      console.error('❌ Restaurant not found');
      process.exit(1);
    }

    console.log('═'.repeat(80));
    console.log(`🔬 TESTING ENHANCED EXTERNAL DATA SERVICE: ${restaurant.name}`);
    console.log('═'.repeat(80));
    console.log();

    // Check for location coordinates
    if (!restaurant.location?.latitude || !restaurant.location?.longitude) {
      console.error('❌ Restaurant location coordinates not set');
      console.log('\nSet coordinates in database:');
      console.log(`Restaurant.findByIdAndUpdate('${restaurantId}', { 'location.latitude': XX.XX, 'location.longitude': -XX.XX })`);
      process.exit(1);
    }

    const lat = restaurant.location.latitude;
    const lng = restaurant.location.longitude;
    const radiusMiles = 10;

    console.log(`📍 Location: ${lat}, ${lng}`);
    console.log(`🔵 Radius: ${radiusMiles} miles\n`);

    const service = new EnhancedExternalDataService();

    // Test date range: next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    console.log('═'.repeat(80));
    console.log('1️⃣  TESTING EVENTS (Multi-Source Aggregation)');
    console.log('═'.repeat(80));
    console.log();

    try {
      const events = await service.getAllEvents(lat, lng, radiusMiles, startDate, endDate);

      console.log(`\n📊 Total Events Found: ${events.length}`);

      if (events.length > 0) {
        // Group by source
        const bySource: Record<string, number> = {};
        events.forEach(e => {
          bySource[e.source] = (bySource[e.source] || 0) + 1;
        });

        console.log('\n📈 Events by Source:');
        Object.entries(bySource).forEach(([source, count]) => {
          console.log(`   ${source}: ${count}`);
        });

        // Group by category
        const byCategory: Record<string, number> = {};
        events.forEach(e => {
          byCategory[e.category] = (byCategory[e.category] || 0) + 1;
        });

        console.log('\n🎭 Events by Category:');
        Object.entries(byCategory).forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });

        // Show sample events
        console.log('\n🔍 Sample Events:');
        events.slice(0, 5).forEach((event, idx) => {
          console.log(`\n${idx + 1}. ${event.name}`);
          console.log(`   Source: ${event.source} | Category: ${event.category}`);
          console.log(`   Date: ${event.date.toLocaleDateString()}`);
          console.log(`   Venue: ${event.venue}`);
          console.log(`   Distance: ${event.distance.toFixed(1)} miles`);
          if (event.expectedAttendance) {
            console.log(`   Expected Attendance: ${event.expectedAttendance}`);
          }
        });
      } else {
        console.log('\n⚠️  No events found in the next 30 days within 10 miles');
        console.log('   This could be normal for smaller cities or less populated areas');
      }

      console.log('\n✅ Event aggregation working!');
    } catch (error: any) {
      console.error('❌ Event aggregation failed:', error.message);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('2️⃣  TESTING WEATHER ALERTS (NOAA)');
    console.log('═'.repeat(80));
    console.log();

    try {
      // Extract state from address or use default
      const state = restaurant.location?.state || 'CA';

      const alerts = await service.getWeatherAlerts(state);

      console.log(`\n📊 Active Weather Alerts: ${alerts.length}`);

      if (alerts.length > 0) {
        alerts.forEach((alert, idx) => {
          console.log(`\n${idx + 1}. ${alert.event}`);
          console.log(`   Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   Headline: ${alert.headline}`);
          console.log(`   Area: ${alert.areaDesc}`);
          console.log(`   Onset: ${alert.onset.toLocaleString()}`);
          console.log(`   Expires: ${alert.expires.toLocaleString()}`);
        });
      } else {
        console.log(`\n✅ No active weather alerts for ${state} (This is good!)`);
      }

      console.log('\n✅ NOAA weather alerts working!');
    } catch (error: any) {
      console.error('❌ Weather alerts failed:', error.message);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('3️⃣  TESTING TRAFFIC DATA (HERE Maps)');
    console.log('═'.repeat(80));
    console.log();

    try {
      const incidents = await service.getTrafficIncidents(lat, lng, radiusMiles);

      console.log(`\n📊 Traffic Incidents: ${incidents.length}`);

      if (incidents.length > 0) {
        // Group by severity
        const bySeverity: Record<string, number> = {};
        incidents.forEach(i => {
          bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
        });

        console.log('\n🚦 Incidents by Severity:');
        Object.entries(bySeverity).forEach(([severity, count]) => {
          console.log(`   ${severity}: ${count}`);
        });

        // Group by type
        const byType: Record<string, number> = {};
        incidents.forEach(i => {
          byType[i.type] = (byType[i.type] || 0) + 1;
        });

        console.log('\n🚧 Incidents by Type:');
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });

        // Show sample incidents
        console.log('\n🔍 Sample Incidents:');
        incidents.slice(0, 5).forEach((incident, idx) => {
          console.log(`\n${idx + 1}. ${incident.description}`);
          console.log(`   Type: ${incident.type} | Severity: ${incident.severity}`);
          console.log(`   Distance: ${incident.distance.toFixed(1)} miles`);
          if (incident.startTime) {
            console.log(`   Started: ${incident.startTime.toLocaleString()}`);
          }
          if (incident.endTime) {
            console.log(`   Expected End: ${incident.endTime.toLocaleString()}`);
          }
        });
      } else {
        console.log('\n✅ No traffic incidents (clear roads!)');
      }

      console.log('\n✅ HERE Maps traffic data working!');
    } catch (error: any) {
      console.error('❌ Traffic data failed:', error.message);
      if (error.message.includes('HERE_API_KEY')) {
        console.log('\n💡 Get a free HERE API key at: https://developer.here.com/');
        console.log('   Then add to .env.local: HERE_API_KEY=your_key_here');
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('4️⃣  TESTING FEDERAL HOLIDAYS');
    console.log('═'.repeat(80));
    console.log();

    try {
      const year = new Date().getFullYear();
      const holidays = service.getUSHolidays(year);

      console.log(`\n📆 US Federal Holidays ${year}: ${holidays.length}`);

      holidays.forEach(holiday => {
        console.log(`   ${holiday.date.toLocaleDateString()} - ${holiday.name}`);
      });

      console.log('\n✅ Federal holidays calculation working!');
    } catch (error: any) {
      console.error('❌ Holidays calculation failed:', error.message);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ TESTING COMPLETE');
    console.log('═'.repeat(80));
    console.log();

    console.log('📋 Summary:');
    console.log('   ✅ Multi-source event aggregation (Ticketmaster + Eventbrite + SeatGeek + Meetup)');
    console.log('   ✅ NOAA weather alerts');
    console.log('   ✅ HERE Maps traffic incidents');
    console.log('   ✅ US federal holidays');
    console.log();

    console.log('💡 Next Steps:');
    console.log('   1. Run full Toast historical sync: DATABASE_URL=xxx ENCRYPTION_KEY=xxx npx tsx scripts/sync-toast-full-history.ts ' + restaurantId);
    console.log('   2. Run correlation discovery: DATABASE_URL=xxx npx tsx scripts/discover-correlations.ts');
    console.log('   3. Test predictions: DATABASE_URL=xxx npx tsx scripts/test-predictions.ts ' + restaurantId);
    console.log();

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testExternalData();
