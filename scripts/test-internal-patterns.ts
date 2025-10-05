/**
 * Test Internal Pattern Engine
 * Discover patterns using ONLY transaction data (no external APIs)
 */

import mongoose from 'mongoose';
import { internalPatternEngine } from '../src/services/InternalPatternEngine';

async function testInternalPatterns() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Analyze last 90 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    console.log('🔍 Discovering Internal Patterns...');
    console.log(`Restaurant: ${restaurantId}`);
    console.log(`Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);
    console.log('═'.repeat(80));

    const patterns = await internalPatternEngine.discoverPatterns(
      restaurantId,
      startDate,
      endDate
    );

    // Display Temporal Patterns
    console.log('\n📅 TEMPORAL PATTERNS');
    console.log('═'.repeat(80));
    if (patterns.temporal.length > 0) {
      patterns.temporal.forEach((pattern, idx) => {
        console.log(`\n${idx + 1}. ${pattern.pattern} - ${pattern.description}`);
        console.log(`   Type: ${pattern.type}`);
        console.log(`   Confidence: ${pattern.confidence.toFixed(1)}%`);
        console.log(`   Revenue Impact: ${pattern.impact.revenueChange > 0 ? '+' : ''}${pattern.impact.revenueChange.toFixed(1)}%`);
        console.log(`   Volume Impact: ${pattern.impact.volumeChange > 0 ? '+' : ''}${pattern.impact.volumeChange.toFixed(1)}%`);
        console.log(`   💡 ${pattern.recommendation}`);
      });
    } else {
      console.log('   No significant temporal patterns found (need more data)');
    }

    // Display Employee Patterns
    console.log('\n\n👥 EMPLOYEE PERFORMANCE PATTERNS');
    console.log('═'.repeat(80));
    if (patterns.employees.length > 0) {
      patterns.employees.slice(0, 10).forEach((emp, idx) => {
        console.log(`\n${idx + 1}. ${emp.employeeName}`);
        console.log(`   Rating: ${'⭐'.repeat(Math.floor(emp.performance.rating))} (${emp.performance.rating.toFixed(1)}/5)`);
        console.log(`   Avg Ticket: $${emp.patterns.avgTicketSize.toFixed(2)}`);
        console.log(`   Revenue/Shift: $${emp.performance.revenuePerShift.toFixed(2)}`);
        if (emp.patterns.upsellRate > 0) {
          console.log(`   Upsell Rate: +${emp.patterns.upsellRate.toFixed(1)}% above average`);
        }
        if (emp.patterns.peakHours.length > 0) {
          console.log(`   Peak Hours: ${emp.patterns.peakHours.join(', ')}`);
        }
        if (emp.patterns.specialties.length > 0) {
          console.log(`   Top Items: ${emp.patterns.specialties.join(', ')}`);
        }
        emp.recommendations.forEach(rec => {
          console.log(`   💡 ${rec}`);
        });
      });
    } else {
      console.log('   No employee data found in transactions');
    }

    // Display Menu Patterns
    console.log('\n\n🍔 MENU & COMBO PATTERNS');
    console.log('═'.repeat(80));
    if (patterns.menu.length > 0) {
      const topCombos = patterns.menu.filter(p => p.type === 'popular_combo').slice(0, 5);
      const upsellOps = patterns.menu.filter(p => p.type === 'upsell_opportunity').slice(0, 5);

      if (topCombos.length > 0) {
        console.log('\n🔥 POPULAR COMBOS:');
        topCombos.forEach((combo, idx) => {
          console.log(`\n   ${idx + 1}. ${combo.items.join(' + ')}`);
          console.log(`      Ordered together: ${combo.frequency} times`);
          console.log(`      Avg Revenue: $${combo.avgRevenue.toFixed(2)}`);
          console.log(`      💡 ${combo.recommendation}`);
        });
      }

      if (upsellOps.length > 0) {
        console.log('\n\n💰 UPSELL OPPORTUNITIES:');
        upsellOps.forEach((item, idx) => {
          console.log(`\n   ${idx + 1}. ${item.items[0]}`);
          console.log(`      ${item.description}`);
          console.log(`      💡 ${item.recommendation}`);
        });
      }
    } else {
      console.log('   No menu patterns found (need item-level data)');
    }

    // Display Customer Patterns
    console.log('\n\n🕐 CUSTOMER BEHAVIOR PATTERNS');
    console.log('═'.repeat(80));
    if (patterns.customers.length > 0) {
      patterns.customers.slice(0, 5).forEach((pattern, idx) => {
        console.log(`\n${idx + 1}. ${pattern.pattern} - ${pattern.description}`);
        console.log(`   Occurrences: ${pattern.occurrences}`);
        console.log(`   Revenue Impact: $${pattern.impact.revenue.toFixed(2)}`);
        console.log(`   💡 ${pattern.recommendation}`);
      });
    } else {
      console.log('   No customer behavior patterns found');
    }

    // Display Revenue Velocity
    console.log('\n\n📈 REVENUE VELOCITY & MOMENTUM');
    console.log('═'.repeat(80));
    console.log(`\nCurrent Velocity:`);
    console.log(`   Daily:   $${patterns.velocity.current.daily.toFixed(2)}`);
    console.log(`   Weekly:  $${patterns.velocity.current.weekly.toFixed(2)}`);
    console.log(`   Monthly: $${patterns.velocity.current.monthly.toFixed(2)}`);
    console.log(`\nTrend: ${patterns.velocity.trend.toUpperCase()}`);
    console.log(`\nPredictions (${patterns.velocity.prediction.confidence.toFixed(0)}% confidence):`);
    console.log(`   Next Week:  $${patterns.velocity.prediction.nextWeek.toFixed(2)}`);
    console.log(`   Next Month: $${patterns.velocity.prediction.nextMonth.toFixed(2)}`);
    console.log(`\nInsights:`);
    patterns.velocity.insights.forEach(insight => {
      console.log(`   ${insight}`);
    });

    console.log('\n\n═'.repeat(80));
    console.log('✅ Pattern Discovery Complete!');
    console.log('═'.repeat(80));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testInternalPatterns();
