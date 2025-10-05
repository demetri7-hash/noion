/**
 * Test Prediction Engine
 * Generate 7-day forecast using discovered patterns and correlations
 */

import mongoose from 'mongoose';
import { predictionEngine } from '../src/services/PredictionEngine';

async function testPredictions() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(80));
    console.log('🔮 7-DAY REVENUE FORECAST');
    console.log('═'.repeat(80));

    const forecast = await predictionEngine.generateWeekForecast(restaurantId);

    console.log(`\n📅 Forecast Period: ${forecast.startDate.toLocaleDateString()} - ${forecast.endDate.toLocaleDateString()}\n`);

    // Display daily predictions
    console.log('DAILY PREDICTIONS:');
    console.log('─'.repeat(80));

    forecast.dailyPredictions.forEach((day, idx) => {
      console.log(`\n${idx + 1}. ${day.dayOfWeek}, ${day.date.toLocaleDateString()}`);
      console.log(`   Revenue Prediction: $${day.predictions.revenue.predicted.toFixed(2)}`);
      console.log(`   Confidence: ${day.predictions.revenue.confidence.toFixed(0)}%`);
      console.log(`   Range: $${day.predictions.revenue.low.toFixed(2)} - $${day.predictions.revenue.high.toFixed(2)}`);
      console.log(`   Expected Traffic: ${day.predictions.traffic.predicted} transactions`);
      console.log(`   Peak Hours: ${day.predictions.traffic.peakHours.join(', ')}`);

      if (day.factors.length > 0) {
        console.log(`\n   Influencing Factors:`);
        day.factors.forEach(factor => {
          const sign = factor.impact > 0 ? '+' : '';
          console.log(`     • ${factor.description}: ${sign}${factor.impact.toFixed(1)}% (${factor.confidence}% confidence)`);
        });
      }

      if (day.recommendations.length > 0) {
        console.log(`\n   💡 Recommendations:`);
        day.recommendations.forEach(rec => {
          console.log(`     • ${rec}`);
        });
      }
    });

    // Display week summary
    console.log('\n\n═'.repeat(80));
    console.log('WEEK SUMMARY');
    console.log('═'.repeat(80));
    console.log(`\nTotal Predicted Revenue: $${forecast.weekTotal.revenue.toFixed(2)}`);
    console.log(`Overall Confidence: ${forecast.weekTotal.confidence.toFixed(0)}%`);

    console.log(`\n🎯 Key Insights:`);
    forecast.keyInsights.forEach(insight => {
      console.log(`   ${insight}`);
    });

    console.log(`\n✅ Action Items for This Week:`);
    forecast.actionItems.forEach((action, idx) => {
      console.log(`   ${idx + 1}. ${action}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Forecast Generation Complete!');
    console.log('═'.repeat(80) + '\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPredictions();
