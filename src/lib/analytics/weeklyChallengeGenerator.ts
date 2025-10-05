/**
 * Weekly Upsell Challenge Generator
 *
 * Generates a 7-day employee challenge with daily upsell goals.
 * Shows potential revenue impact at different success rates (25%, 50%, 75%, 100%).
 * Based on historical order data.
 */

import { Transaction } from '@/models';
import { Types } from 'mongoose';

export interface DailyChallenge {
  day: string; // Monday, Tuesday, etc.
  date: string; // Actual date for the week
  itemName: string;
  category: string;
  currentPrice: number;
  currentPenetration: number; // % of orders that already have this item

  // Historical data
  avgDailyOrders: number; // Average orders per day (from history)
  currentDailyWithItem: number; // Current avg orders per day with this item

  // Potential impact at different success rates
  impact: {
    successRate: number; // 25, 50, 75, 100
    additionalOrders: number;
    dailyRevenue: number;
    weeklyRevenue: number; // If sustained all week
    monthlyRevenue: number; // If sustained for 30 days
  }[];

  // Challenge text
  challengeText: string;
  motivationText: string;
}

export interface WeeklyChallenge {
  weekStartDate: Date;
  weekEndDate: Date;
  restaurantId: string;

  // Overall stats
  avgDailyOrders: number;
  analysisBasedOn: {
    totalOrders: number;
    daysAnalyzed: number;
    dateRange: { start: Date; end: Date };
  };

  // Daily challenges
  dailyChallenges: DailyChallenge[];

  // Weekly totals if all challenges succeed
  weeklyPotential: {
    at25Percent: number;
    at50Percent: number;
    at75Percent: number;
    at100Percent: number;
  };

  // Generated timestamp
  generatedAt: Date;
}

/**
 * Generate a weekly challenge for the upcoming week
 */
export async function generateWeeklyChallenge(
  restaurantId: string,
  weekStartDate?: Date
): Promise<WeeklyChallenge> {

  // Default to next Monday if not specified
  const startDate = weekStartDate || getNextMonday();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // Sunday

  // Analyze last 30 days of data
  const analysisEndDate = new Date();
  const analysisStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch transactions for analysis
  const transactions = await Transaction.find({
    restaurantId: new Types.ObjectId(restaurantId),
    transactionDate: { $gte: analysisStartDate, $lte: analysisEndDate }
  }).lean();

  if (transactions.length < 100) {
    throw new Error('Not enough transaction data to generate challenge (need at least 100 orders)');
  }

  // Calculate average daily orders
  const daysAnalyzed = Math.ceil((analysisEndDate.getTime() - analysisStartDate.getTime()) / (24 * 60 * 60 * 1000));
  const avgDailyOrders = Math.round(transactions.length / daysAnalyzed);

  // Build item catalog with frequency
  const itemCatalog = new Map<string, {
    prices: number[];
    count: number;
    category: string;
  }>();

  transactions.forEach((tx: any) => {
    tx.items?.forEach((item: any) => {
      const itemName = item.name || 'Unknown';
      if (itemName === 'Unknown' || itemName === 'MenuItem') return;

      if (!itemCatalog.has(itemName)) {
        itemCatalog.set(itemName, {
          prices: [],
          count: 0,
          category: item.category || 'General'
        });
      }

      const catalogItem = itemCatalog.get(itemName)!;
      catalogItem.prices.push(item.unitPrice || 0);
      catalogItem.count++;
    });
  });

  // Find good upsell candidates (not too common, not too rare, decent price point)
  const candidates = Array.from(itemCatalog.entries())
    .map(([name, data]) => ({
      name,
      category: data.category,
      avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
      count: data.count,
      penetration: (data.count / transactions.length) * 100
    }))
    .filter(item => {
      // Good candidates:
      // - Between 5% and 40% penetration (room for growth)
      // - Price > $2 (meaningful revenue)
      // - At least 50 orders (proven demand)
      return item.penetration >= 5 &&
             item.penetration <= 40 &&
             item.avgPrice >= 2 &&
             item.count >= 50;
    })
    .sort((a, b) => {
      // Prioritize by potential revenue (price * room for growth)
      const potentialA = a.avgPrice * (100 - a.penetration);
      const potentialB = b.avgPrice * (100 - b.penetration);
      return potentialB - potentialA;
    });

  if (candidates.length < 7) {
    throw new Error('Not enough suitable items found for weekly challenge');
  }

  // Select 7 different items for the week (try to diversify)
  const selectedItems = selectDiverseItems(candidates, 7);

  // Generate daily challenges
  const dailyChallenges: DailyChallenge[] = [];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const item = selectedItems[i];
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);

    const currentDailyWithItem = Math.round((item.count / daysAnalyzed));

    // Calculate impact at different success rates
    const impact = [25, 50, 75, 100].map(successRate => {
      const targetOrders = Math.round(avgDailyOrders * (successRate / 100));
      const additionalOrders = Math.max(0, targetOrders - currentDailyWithItem);
      const dailyRevenue = additionalOrders * item.avgPrice;

      return {
        successRate,
        additionalOrders,
        dailyRevenue,
        weeklyRevenue: dailyRevenue * 7,
        monthlyRevenue: dailyRevenue * 30
      };
    });

    dailyChallenges.push({
      day: daysOfWeek[i],
      date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      itemName: item.name,
      category: item.category,
      currentPrice: item.avgPrice,
      currentPenetration: item.penetration,
      avgDailyOrders,
      currentDailyWithItem,
      impact,
      challengeText: generateChallengeText(daysOfWeek[i], item.name, item.avgPrice),
      motivationText: generateMotivationText(item.name, impact[1].dailyRevenue) // 50% impact
    });
  }

  // Calculate weekly totals
  const weeklyPotential = {
    at25Percent: dailyChallenges.reduce((sum, c) => sum + c.impact[0].dailyRevenue, 0),
    at50Percent: dailyChallenges.reduce((sum, c) => sum + c.impact[1].dailyRevenue, 0),
    at75Percent: dailyChallenges.reduce((sum, c) => sum + c.impact[2].dailyRevenue, 0),
    at100Percent: dailyChallenges.reduce((sum, c) => sum + c.impact[3].dailyRevenue, 0)
  };

  return {
    weekStartDate: startDate,
    weekEndDate: endDate,
    restaurantId,
    avgDailyOrders,
    analysisBasedOn: {
      totalOrders: transactions.length,
      daysAnalyzed,
      dateRange: { start: analysisStartDate, end: analysisEndDate }
    },
    dailyChallenges,
    weeklyPotential,
    generatedAt: new Date()
  };
}

/**
 * Select diverse items (try to vary categories)
 */
function selectDiverseItems(candidates: any[], count: number): any[] {
  const selected: any[] = [];
  const usedCategories = new Set<string>();

  // First pass: one from each category
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (!usedCategories.has(candidate.category)) {
      selected.push(candidate);
      usedCategories.add(candidate.category);
    }
  }

  // Second pass: fill remaining slots with best candidates
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
}

/**
 * Generate challenge text for the day
 */
function generateChallengeText(day: string, itemName: string, price: number): string {
  const priceStr = `$${price.toFixed(2)}`;

  const templates = [
    `${day}'s Challenge: Suggest "${itemName}" (${priceStr}) to every customer!`,
    `🎯 ${day}: Add "${itemName}" to as many orders as possible!`,
    `Today's Mission (${day}): Upsell "${itemName}" - ${priceStr} each!`,
    `${day} Goal: Get customers excited about "${itemName}"!`,
    `Challenge for ${day}: Make "${itemName}" your go-to recommendation!`
  ];

  // Pick template based on day of week
  const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
  return templates[dayIndex % templates.length];
}

/**
 * Generate motivation text
 */
function generateMotivationText(itemName: string, impact50: number): string {
  return `If the team hits 50% success rate, we add $${impact50.toFixed(0)} in revenue today! 🚀`;
}

/**
 * Get next Monday date
 */
function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day); // 0 = Sunday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

/**
 * Format challenge as copy-paste text for team message
 */
export function formatChallengeForTeam(challenge: WeeklyChallenge): string {
  const lines: string[] = [];

  lines.push('🏆 WEEKLY UPSELL CHALLENGE 🏆');
  lines.push('');
  lines.push(`Week of ${challenge.weekStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${challenge.weekEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`);
  lines.push('');
  lines.push('📊 Based on our average of ' + challenge.avgDailyOrders + ' orders per day');
  lines.push('');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  challenge.dailyChallenges.forEach((day, idx) => {
    lines.push(`${day.day.toUpperCase()} - ${day.date}`);
    lines.push(`🎯 Goal: ${day.itemName} ($${day.currentPrice.toFixed(2)})`);
    lines.push(`📈 Currently on ${day.currentDailyWithItem} orders/day (${day.currentPenetration.toFixed(0)}%)`);
    lines.push('');
    lines.push('💰 IMPACT IF WE HIT:');
    day.impact.forEach(impact => {
      lines.push(`   ${impact.successRate}% success → +${impact.additionalOrders} orders → +$${impact.dailyRevenue.toFixed(0)}/day`);
    });
    lines.push('');
    lines.push(`💡 ${day.motivationText}`);
    lines.push('');

    if (idx < challenge.dailyChallenges.length - 1) {
      lines.push('───────────────────────────────────────');
      lines.push('');
    }
  });

  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push('🎁 PRIZE: [Owner will announce]');
  lines.push('');
  lines.push('📊 WEEKLY TEAM POTENTIAL:');
  lines.push(`   25% success rate: +$${challenge.weeklyPotential.at25Percent.toFixed(0)}/week`);
  lines.push(`   50% success rate: +$${challenge.weeklyPotential.at50Percent.toFixed(0)}/week`);
  lines.push(`   75% success rate: +$${challenge.weeklyPotential.at75Percent.toFixed(0)}/week`);
  lines.push(`  100% success rate: +$${challenge.weeklyPotential.at100Percent.toFixed(0)}/week`);
  lines.push('');
  lines.push('🏆 WHOEVER ADDS THE MOST OF EACH DAY\'S ITEM WINS!');
  lines.push('');
  lines.push('Let\'s make it happen team! 💪');

  return lines.join('\n');
}
