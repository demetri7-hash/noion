/**
 * Upsell Opportunity Analytics
 *
 * Calculates real revenue opportunities from transaction data
 */

import { Transaction } from '@/models';
import { Types } from 'mongoose';

export interface UpsellOpportunity {
  id: string;
  category: string;
  itemName: string;
  description: string;

  // Current state
  currentPenetration: number; // % of orders with this item
  ordersWithItem: number;
  ordersWithoutItem: number;
  averagePrice: number;

  // Opportunity
  targetPenetration: number; // Realistic target %
  potentialUpsells: number; // Additional orders we could capture
  potentialRevenue: number; // Revenue opportunity

  // Sample items
  topItems: {
    name: string;
    price: number;
    frequency: number;
  }[];

  // Actionable insight
  actionableInsight: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UpsellAnalyticsResult {
  totalOpportunity: number;
  opportunityCount: number;
  opportunities: UpsellOpportunity[];
  transactionCount: number;
  analysisDate: Date;
}

/**
 * Calculate upsell opportunities for a restaurant
 */
export async function calculateUpsellOpportunities(
  restaurantId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    minTransactions?: number;
  }
): Promise<UpsellAnalyticsResult> {

  const startDate = options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days default
  const endDate = options?.endDate || new Date();
  const minTransactions = options?.minTransactions || 100;

  // Fetch transactions
  const transactions = await Transaction.find({
    restaurantId: new Types.ObjectId(restaurantId),
    transactionDate: { $gte: startDate, $lte: endDate }
  }).lean();

  if (transactions.length < minTransactions) {
    return {
      totalOpportunity: 0,
      opportunityCount: 0,
      opportunities: [],
      transactionCount: transactions.length,
      analysisDate: new Date()
    };
  }

  // Build item catalog
  const itemCatalog = new Map<string, {
    prices: number[],
    category: string,
    count: number
  }>();

  const modifierCatalog = new Map<string, {
    prices: number[],
    count: number
  }>();

  transactions.forEach((tx: any) => {
    tx.items?.forEach((item: any) => {
      const itemName = item.name || 'Unknown';
      const category = item.category || 'General';

      if (!itemCatalog.has(itemName)) {
        itemCatalog.set(itemName, { prices: [], category, count: 0 });
      }

      const catalogItem = itemCatalog.get(itemName)!;
      catalogItem.prices.push(item.unitPrice || 0);
      catalogItem.count++;

      // Track modifiers
      item.modifiers?.forEach((mod: any) => {
        const modName = mod.name || 'Unknown';
        if (!modifierCatalog.has(modName)) {
          modifierCatalog.set(modName, { prices: [], count: 0 });
        }
        const catalogMod = modifierCatalog.get(modName)!;
        catalogMod.prices.push(mod.price || 0);
        catalogMod.count++;
      });
    });
  });

  const opportunities: UpsellOpportunity[] = [];

  // Analyze by item name patterns
  const patterns = {
    'Drinks/Beverages': {
      regex: /(drink|soda|juice|water|lemonade|tea|coffee|smoothie|shake|beverage|coke|pepsi|sprite|fountain)/i,
      description: 'Beverages and drinks',
      targetIncrease: 0.25 // Target 25% increase
    },
    'Sides': {
      regex: /(side|fries|chips|salad|rice|beans|coleslaw|potato|vegg|soup)/i,
      description: 'Side dishes',
      targetIncrease: 0.30
    },
    'Desserts': {
      regex: /(dessert|cake|pie|ice cream|cookie|brownie|sweet|baklava)/i,
      description: 'Desserts and sweets',
      targetIncrease: 0.35
    },
    'Extras/Add-ons': {
      regex: /(add|extra|bacon|cheese|avocado|guac)/i,
      description: 'Add-ons and extras',
      targetIncrease: 0.20
    }
  };

  for (const [categoryName, config] of Object.entries(patterns)) {
    const matchingItems = Array.from(itemCatalog.entries())
      .filter(([name, _]) => config.regex.test(name))
      .map(([name, data]) => ({
        name,
        avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
        count: data.count
      }))
      .filter(item => item.avgPrice > 0); // Filter out free items

    if (matchingItems.length === 0) continue;

    // Count orders with items matching this pattern
    let ordersWithPattern = 0;
    transactions.forEach((tx: any) => {
      const hasPattern = tx.items?.some((item: any) =>
        config.regex.test(item.name || '')
      );
      if (hasPattern) ordersWithPattern++;
    });

    const ordersWithoutPattern = transactions.length - ordersWithPattern;
    const currentPenetration = (ordersWithPattern / transactions.length) * 100;
    const avgPrice = matchingItems.reduce((sum, item) => sum + item.avgPrice, 0) / matchingItems.length;

    // Calculate realistic target
    const targetPenetration = Math.min(currentPenetration + (config.targetIncrease * 100), 90); // Cap at 90%
    const targetOrders = Math.floor(transactions.length * (targetPenetration / 100));
    const potentialUpsells = Math.max(0, targetOrders - ordersWithPattern);
    const potentialRevenue = potentialUpsells * avgPrice;

    // Only include if there's significant opportunity
    if (potentialUpsells > 50 && potentialRevenue > 100) {
      const priority = potentialRevenue > 5000 ? 'high' :
                      potentialRevenue > 2000 ? 'medium' : 'low';

      opportunities.push({
        id: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        category: categoryName,
        itemName: categoryName,
        description: config.description,
        currentPenetration,
        ordersWithItem: ordersWithPattern,
        ordersWithoutItem: ordersWithoutPattern,
        averagePrice: avgPrice,
        targetPenetration,
        potentialUpsells,
        potentialRevenue,
        topItems: matchingItems
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(item => ({
            name: item.name,
            price: item.avgPrice,
            frequency: item.count
          })),
        actionableInsight: generateActionableInsight(
          categoryName,
          currentPenetration,
          targetPenetration,
          potentialRevenue,
          matchingItems[0]?.name || categoryName
        ),
        priority
      });
    }
  }

  // Analyze top modifiers (proven upsells)
  const topModifiers = Array.from(modifierCatalog.entries())
    .map(([name, data]) => ({
      name,
      avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
      count: data.count,
      totalRevenue: data.prices.reduce((sum, p) => sum + p, 0)
    }))
    .filter(mod => mod.avgPrice > 0 && mod.count > 10)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  topModifiers.forEach(mod => {
    const currentPenetration = (mod.count / transactions.length) * 100;
    const targetPenetration = Math.min(currentPenetration + 15, 60); // +15% increase, cap at 60%
    const targetOrders = Math.floor(transactions.length * (targetPenetration / 100));
    const potentialUpsells = Math.max(0, targetOrders - mod.count);
    const potentialRevenue = potentialUpsells * mod.avgPrice;

    if (potentialUpsells > 20 && potentialRevenue > 100) {
      opportunities.push({
        id: `modifier_${mod.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        category: 'Add-ons',
        itemName: mod.name,
        description: 'Popular modifier/add-on',
        currentPenetration,
        ordersWithItem: mod.count,
        ordersWithoutItem: transactions.length - mod.count,
        averagePrice: mod.avgPrice,
        targetPenetration,
        potentialUpsells,
        potentialRevenue,
        topItems: [{ name: mod.name, price: mod.avgPrice, frequency: mod.count }],
        actionableInsight: `"${mod.name}" is already popular. Suggesting it more often could add $${potentialRevenue.toFixed(0)} in revenue.`,
        priority: potentialRevenue > 3000 ? 'high' : 'medium'
      });
    }
  });

  // Sort by revenue opportunity
  opportunities.sort((a, b) => b.potentialRevenue - a.potentialRevenue);

  const totalOpportunity = opportunities.reduce((sum, opp) => sum + opp.potentialRevenue, 0);

  return {
    totalOpportunity,
    opportunityCount: opportunities.length,
    opportunities,
    transactionCount: transactions.length,
    analysisDate: new Date()
  };
}

function generateActionableInsight(
  category: string,
  current: number,
  target: number,
  revenue: number,
  topItem: string
): string {
  const increase = target - current;

  if (category.includes('Drink') || category.includes('Beverage')) {
    return `Only ${current.toFixed(0)}% of orders include drinks. Suggesting "${topItem}" could add $${revenue.toFixed(0)} in revenue.`;
  }

  if (category.includes('Side')) {
    return `${current.toFixed(0)}% of orders have sides. Training staff to recommend "${topItem}" could capture $${revenue.toFixed(0)}.`;
  }

  if (category.includes('Dessert')) {
    return `Desserts are only on ${current.toFixed(0)}% of orders. Mentioning "${topItem}" at checkout could add $${revenue.toFixed(0)}.`;
  }

  return `Increasing ${category.toLowerCase()} from ${current.toFixed(0)}% to ${target.toFixed(0)}% could generate $${revenue.toFixed(0)} additional revenue.`;
}
