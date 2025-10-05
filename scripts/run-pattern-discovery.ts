/**
 * Background Pattern Discovery Job
 *
 * Runs after historical Toast sync completes to discover patterns and generate insights.
 * This should be triggered automatically when sync status becomes 'completed'.
 *
 * Discovers:
 * - Temporal patterns (day/week, time of day)
 * - Employee performance patterns
 * - Menu item combinations and upsell opportunities
 * - Customer behavior patterns
 * - Revenue velocity and trends
 *
 * Results are stored in the Insight model for display on the business analytics page.
 */

import mongoose from 'mongoose';
import { Restaurant, Transaction } from '../src/models';
import Insight, { InsightType, InsightCategory, InsightPriority, InsightStatus } from '../src/models/Insight';
import { internalPatternEngine } from '../src/services/InternalPatternEngine';
import type { TemporalPattern, EmployeePattern, MenuPattern, CustomerPattern, RevenueVelocity } from '../src/services/InternalPatternEngine';

interface PatternDiscoveryOptions {
  restaurantId: string;
  daysBack?: number;
}

async function runPatternDiscovery(options: PatternDiscoveryOptions) {
  const { restaurantId, daysBack = 30 } = options;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PATTERN DISCOVERY JOB - Restaurant ${restaurantId}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('✅ Connected to database\n');

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant ${restaurantId} not found`);
    }
    console.log(`📍 Restaurant: ${restaurant.name || 'Unknown'}\n`);

    // Set date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    console.log(`📅 Analysis Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log(`   (${daysBack} days of data)\n`);

    // Check transaction count
    const transactionCount = await Transaction.countDocuments({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      transactionDate: { $gte: startDate, $lte: endDate }
    });

    console.log(`📊 Transactions found: ${transactionCount.toLocaleString()}`);

    if (transactionCount === 0) {
      console.log('\n⚠️  No transactions found. Pattern discovery requires transaction data.');
      console.log('   Please ensure the Toast sync has completed successfully.\n');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔬 Running Internal Pattern Engine...\n');

    // Run pattern discovery
    const startTime = Date.now();
    const patterns = await internalPatternEngine.discoverPatterns(restaurantId, startDate, endDate);
    const processingTime = Date.now() - startTime;

    console.log(`\n✅ Pattern discovery completed in ${(processingTime / 1000).toFixed(1)}s\n`);

    // Display summary
    console.log(`${'─'.repeat(80)}`);
    console.log('DISCOVERY SUMMARY');
    console.log(`${'─'.repeat(80)}\n`);
    console.log(`  • Temporal Patterns: ${patterns.temporal.length}`);
    console.log(`  • Employee Patterns: ${patterns.employees.length}`);
    console.log(`  • Menu Patterns: ${patterns.menu.length}`);
    console.log(`  • Customer Patterns: ${patterns.customers.length}`);
    console.log(`  • Revenue Velocity: ${patterns.velocity.insights.length} insights\n`);

    // Transform patterns into Insight model format
    console.log('💾 Saving insights to database...\n');

    const insight = await createInsightFromPatterns(
      restaurantId,
      startDate,
      endDate,
      patterns,
      transactionCount,
      processingTime
    );

    console.log(`✅ Insight saved with ID: ${insight._id}\n`);

    // Display key findings
    console.log(`${'─'.repeat(80)}`);
    console.log('KEY FINDINGS');
    console.log(`${'─'.repeat(80)}\n`);

    insight.keyFindings.slice(0, 5).forEach((finding, idx) => {
      console.log(`${idx + 1}. ${finding.title}`);
      console.log(`   ${finding.description}`);
      console.log(`   Impact: ${finding.impact.value}${finding.impact.unit} ${finding.impact.timeframe}`);
      console.log(`   Confidence: ${finding.confidenceScore}%\n`);
    });

    // Display top recommendations
    console.log(`${'─'.repeat(80)}`);
    console.log('TOP RECOMMENDATIONS');
    console.log(`${'─'.repeat(80)}\n`);

    insight.recommendations.slice(0, 5).forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.title} [${rec.priority.toUpperCase()}]`);
      console.log(`   ${rec.description}`);
      console.log(`   Expected ROI: $${rec.implementation.roi.expectedReturn.toFixed(0)} in ${rec.implementation.roi.timeframe}`);
      console.log(`   Difficulty: ${rec.implementation.difficulty}\n`);
    });

    console.log(`${'='.repeat(80)}`);
    console.log('✅ PATTERN DISCOVERY COMPLETE');
    console.log(`${'='.repeat(80)}\n`);

    console.log('📊 View insights on Business Analytics page');
    console.log(`   → http://localhost:3000/analytics/${restaurantId}\n`);

    await mongoose.disconnect();

  } catch (error: any) {
    console.error('\n❌ Pattern discovery failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

/**
 * Transform discovered patterns into Insight model format
 */
async function createInsightFromPatterns(
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  patterns: {
    temporal: TemporalPattern[];
    employees: EmployeePattern[];
    menu: MenuPattern[];
    customers: CustomerPattern[];
    velocity: RevenueVelocity;
  },
  transactionCount: number,
  processingTime: number
): Promise<any> {
  // Calculate total revenue
  const revenueStats = await Transaction.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        transactionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ['$total', '$totalAmount'] } }
      }
    }
  ]);

  const totalRevenue = revenueStats[0]?.totalRevenue || 0;

  // Build key findings
  const keyFindings: any[] = [];

  // Add temporal pattern findings
  patterns.temporal.forEach(pattern => {
    keyFindings.push({
      category: InsightCategory.PEAK_HOUR_ANALYSIS,
      title: pattern.description,
      description: pattern.pattern,
      impact: {
        type: 'revenue',
        value: Math.abs(pattern.impact.revenueChange),
        unit: '%',
        timeframe: 'weekly'
      },
      evidence: {
        dataPoints: [{
          metric: 'Revenue Change',
          value: pattern.impact.revenueChange,
          benchmark: 0
        }],
        trends: []
      },
      confidenceScore: pattern.confidence,
      priority: Math.abs(pattern.impact.revenueChange) > 20 ? InsightPriority.HIGH : InsightPriority.MEDIUM
    });
  });

  // Add employee performance findings
  patterns.employees.slice(0, 3).forEach(emp => {
    const isTopPerformer = emp.performance.rating >= 4;
    keyFindings.push({
      category: InsightCategory.EMPLOYEE_PERFORMANCE,
      title: `${emp.employeeName} - ${isTopPerformer ? 'Top' : 'Average'} Performer`,
      description: `Average ticket size: $${emp.patterns.avgTicketSize.toFixed(2)}, Rating: ${emp.performance.rating.toFixed(1)}/5`,
      impact: {
        type: 'revenue',
        value: emp.performance.revenuePerShift,
        unit: '$',
        timeframe: 'daily'
      },
      evidence: {
        dataPoints: [{
          metric: 'Avg Ticket Size',
          value: emp.patterns.avgTicketSize
        }],
        trends: []
      },
      confidenceScore: 75,
      priority: isTopPerformer ? InsightPriority.HIGH : InsightPriority.MEDIUM
    });
  });

  // Add menu pattern findings
  patterns.menu.slice(0, 5).forEach(menu => {
    keyFindings.push({
      category: menu.type === 'upsell_opportunity' ? InsightCategory.UPSELLING_OPPORTUNITIES : InsightCategory.MENU_OPTIMIZATION,
      title: menu.description,
      description: menu.recommendation,
      impact: {
        type: 'revenue',
        value: menu.avgRevenue || menu.frequency * 5,
        unit: '$',
        timeframe: 'weekly'
      },
      evidence: {
        dataPoints: [{
          metric: 'Frequency',
          value: menu.frequency
        }],
        trends: []
      },
      confidenceScore: 70,
      priority: menu.type === 'upsell_opportunity' ? InsightPriority.HIGH : InsightPriority.MEDIUM
    });
  });

  // Add revenue velocity finding
  keyFindings.push({
    category: InsightCategory.REVENUE_OPTIMIZATION,
    title: `Revenue Trend: ${patterns.velocity.trend.toUpperCase()}`,
    description: patterns.velocity.insights.join('. '),
    impact: {
      type: 'revenue',
      value: patterns.velocity.current.daily,
      unit: '$',
      timeframe: 'daily'
    },
    evidence: {
      dataPoints: [{
        metric: 'Daily Revenue',
        value: patterns.velocity.current.daily
      }],
      trends: []
    },
    confidenceScore: patterns.velocity.prediction.confidence,
    priority: patterns.velocity.trend === 'decelerating' ? InsightPriority.CRITICAL : InsightPriority.MEDIUM
  });

  // Build recommendations
  const recommendations: any[] = [];
  let recId = 1;

  // Add temporal recommendations
  patterns.temporal.forEach(pattern => {
    recommendations.push({
      id: `temp_${recId++}`,
      title: pattern.recommendation,
      description: `Based on ${pattern.type} analysis showing ${pattern.impact.revenueChange > 0 ? '+' : ''}${pattern.impact.revenueChange.toFixed(1)}% revenue change`,
      category: InsightCategory.PEAK_HOUR_ANALYSIS,
      priority: Math.abs(pattern.impact.revenueChange) > 20 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
      implementation: {
        difficulty: 'easy',
        timeRequired: '1 hour',
        cost: 0,
        roi: {
          timeframe: '2 weeks',
          expectedReturn: Math.abs(pattern.impact.revenueChange) * totalRevenue / 100 / 26,
          probability: pattern.confidence
        }
      },
      steps: [
        { stepNumber: 1, description: 'Review scheduling for identified period', estimatedTime: '15 minutes' },
        { stepNumber: 2, description: 'Adjust staff levels accordingly', estimatedTime: '30 minutes' },
        { stepNumber: 3, description: 'Monitor results for 2 weeks', estimatedTime: 'Ongoing' }
      ],
      metrics: {
        kpis: ['Revenue', 'Customer Wait Time', 'Staff Utilization'],
        trackingMethod: 'Compare revenue and service metrics before/after change',
        expectedImprovement: `${Math.abs(pattern.impact.revenueChange).toFixed(0)}% improvement`
      },
      status: 'suggested'
    });
  });

  // Add employee recommendations
  patterns.employees.forEach(emp => {
    emp.recommendations.forEach(rec => {
      recommendations.push({
        id: `emp_${recId++}`,
        title: `${emp.employeeName}: ${rec}`,
        description: `Performance rating: ${emp.performance.rating.toFixed(1)}/5, Avg ticket: $${emp.patterns.avgTicketSize.toFixed(2)}`,
        category: InsightCategory.EMPLOYEE_PERFORMANCE,
        priority: emp.performance.rating >= 4 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        implementation: {
          difficulty: 'medium',
          timeRequired: '1 week',
          cost: 0,
          roi: {
            timeframe: '1 month',
            expectedReturn: emp.performance.revenuePerShift * 4,
            probability: 70
          }
        },
        steps: [
          { stepNumber: 1, description: 'Schedule training/mentoring session', estimatedTime: '30 minutes' },
          { stepNumber: 2, description: 'Implement recommendation', estimatedTime: '3-5 days' },
          { stepNumber: 3, description: 'Track performance improvement', estimatedTime: 'Ongoing' }
        ],
        metrics: {
          kpis: ['Avg Ticket Size', 'Upsell Rate', 'Customer Satisfaction'],
          trackingMethod: 'Track employee metrics weekly',
          expectedImprovement: '10-20% ticket size increase'
        },
        status: 'suggested'
      });
    });
  });

  // Add menu recommendations
  patterns.menu.slice(0, 5).forEach(menu => {
    recommendations.push({
      id: `menu_${recId++}`,
      title: menu.recommendation,
      description: `${menu.description} - Found ${menu.frequency} times`,
      category: menu.type === 'upsell_opportunity' ? InsightCategory.UPSELLING_OPPORTUNITIES : InsightCategory.MENU_OPTIMIZATION,
      priority: menu.type === 'upsell_opportunity' ? InsightPriority.HIGH : InsightPriority.MEDIUM,
      implementation: {
        difficulty: menu.type === 'popular_combo' ? 'medium' : 'easy',
        timeRequired: menu.type === 'popular_combo' ? '1 week' : '3 days',
        cost: menu.type === 'popular_combo' ? 100 : 0,
        roi: {
          timeframe: '1 month',
          expectedReturn: (menu.avgRevenue || 10) * menu.frequency * 4,
          probability: 65
        }
      },
      steps: [
        { stepNumber: 1, description: 'Train staff on recommendation', estimatedTime: '1 hour' },
        { stepNumber: 2, description: 'Update POS prompts if needed', estimatedTime: '30 minutes' },
        { stepNumber: 3, description: 'Track uptake over 30 days', estimatedTime: 'Ongoing' }
      ],
      metrics: {
        kpis: ['Attach Rate', 'Revenue per Transaction'],
        trackingMethod: 'Track item sales and attachment rates',
        expectedImprovement: '15-25% increase in attach rate'
      },
      status: 'suggested'
    });
  });

  // Calculate lost revenue (opportunity cost)
  const lostRevenue = {
    total: 0,
    breakdown: [] as any[],
    methodology: 'Calculated based on underperforming periods, missed upsell opportunities, and inefficient staffing',
    confidenceLevel: 70
  };

  // Add lost revenue from slow periods
  patterns.temporal.forEach(pattern => {
    if (pattern.impact.revenueChange < -15) {
      const amount = Math.abs(pattern.impact.revenueChange) * totalRevenue / 100;
      lostRevenue.breakdown.push({
        category: 'Underperforming Periods',
        amount,
        description: `${pattern.pattern}: ${pattern.impact.revenueChange.toFixed(1)}% below average`
      });
      lostRevenue.total += amount;
    }
  });

  // Add lost revenue from upsell opportunities
  const upsellOpportunities = patterns.menu.filter(m => m.type === 'upsell_opportunity');
  const upsellLoss = upsellOpportunities.reduce((sum, m) => sum + (m.frequency * 5), 0);
  if (upsellLoss > 0) {
    lostRevenue.breakdown.push({
      category: 'Missed Upsell Opportunities',
      amount: upsellLoss,
      description: `${upsellOpportunities.length} menu items with low attachment rates`
    });
    lostRevenue.total += upsellLoss;
  }

  // Create the insight document
  const insight = new Insight({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    type: InsightType.WEEKLY_SUMMARY,
    title: `Pattern Discovery Report - ${new Date().toLocaleDateString()}`,
    summary: `Discovered ${keyFindings.length} patterns across temporal trends, employee performance, menu optimization, and customer behavior. Found $${lostRevenue.total.toFixed(0)} in potential revenue opportunities.`,

    analysisStartDate: startDate,
    analysisEndDate: endDate,

    dataSource: {
      transactions: {
        startDate,
        endDate,
        totalCount: transactionCount,
        totalRevenue
      }
    },

    keyFindings,
    recommendations,
    benchmarks: [],
    lostRevenue,

    aiAnalysis: {
      model: 'internal-pattern-engine-v1',
      promptVersion: '1.0',
      rawResponse: JSON.stringify(patterns, null, 2),
      processingTime,
      tokensUsed: 0
    },

    status: InsightStatus.GENERATED,
    priority: InsightPriority.HIGH,

    engagement: {
      emailOpened: false,
      reportViewed: false,
      recommendationsViewed: [],
      recommendationsImplemented: [],
      shareCount: 0,
      exportCount: 0
    },

    generatedBy: 'system',
    generatedAt: new Date(),
    version: 1
  });

  return insight.save();
}

// Run the job
const restaurantId = process.argv[2];

if (!restaurantId) {
  console.error('❌ Error: Restaurant ID is required');
  console.log('\nUsage: npx tsx scripts/run-pattern-discovery.ts <restaurantId> [daysBack]');
  console.log('Example: npx tsx scripts/run-pattern-discovery.ts 68e0bd8a603ef36c8257e021 30\n');
  process.exit(1);
}

const daysBack = process.argv[3] ? parseInt(process.argv[3]) : 30;

runPatternDiscovery({ restaurantId, daysBack });
