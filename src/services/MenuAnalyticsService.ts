import Transaction from '../models/Transaction';
import { Types } from 'mongoose';

/**
 * Menu Analytics Service
 * Analyzes actual restaurant menu items to find upsell opportunities
 * Uses real transaction data to show concrete revenue potential
 */

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  frequency: number; // How often ordered
}

export interface UpsellOpportunity {
  baseItem: MenuItem;
  suggestedItem: MenuItem;

  // Pattern discovered
  pattern: {
    description: string;
    confidence: number;
    whenOrdered: string;    // "When customer orders Burger"
    alsoOrdered: string;    // "35% also order Fries"
    attachRate: number;     // 0.35 = 35%
    sampleSize: number;
  };

  // Missed opportunities
  missedOpportunities: {
    totalBaseOrders: number;
    ordersWithUpsell: number;
    ordersWithoutUpsell: number;
    missedCount: number;
    missedPercentage: number;
  };

  // Revenue impact
  revenueImpact: {
    currentMonthly: number;
    potentialMonthly: number;
    missedMonthly: number;
    ifUpsoldAt50Percent: number;
    ifUpsoldAt75Percent: number;
    perTransaction: number;
  };

  // Actionable recommendation
  recommendation: {
    title: string;
    description: string;
    implementation: string;
    expectedRevenue: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
  };
}

export interface MenuInsights {
  topItems: MenuItem[];
  underperformingItems: MenuItem[];
  upsellOpportunities: UpsellOpportunity[];
  bundleOpportunities: Array<{
    items: MenuItem[];
    frequency: number;
    bundlePrice: number;
    savings: number;
    potentialRevenue: number;
  }>;
}

export class MenuAnalyticsService {
  /**
   * Analyze menu and find upsell opportunities
   */
  async analyzeMenu(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MenuInsights> {
    console.log(`Analyzing menu for restaurant ${restaurantId}`);

    // Get all transactions
    const transactions = await Transaction.find({
      restaurantId: new Types.ObjectId(restaurantId),
      transactionDate: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    if (transactions.length === 0) {
      throw new Error('No transaction data available');
    }

    // Extract menu items and their relationships
    const { menuItems, itemPairs } = this.extractMenuPatterns(transactions);

    // Find top performers
    const topItems = this.getTopItems(menuItems, 10);

    // Find underperforming items
    const underperformingItems = this.getUnderperformingItems(menuItems, topItems);

    // Find upsell opportunities
    const upsellOpportunities = await this.findUpsellOpportunities(
      transactions,
      menuItems,
      itemPairs
    );

    // Find bundle opportunities
    const bundleOpportunities = this.findBundleOpportunities(itemPairs, menuItems);

    return {
      topItems,
      underperformingItems,
      upsellOpportunities,
      bundleOpportunities
    };
  }

  /**
   * Extract menu items and their co-occurrence patterns
   */
  private extractMenuPatterns(transactions: any[]): {
    menuItems: Map<string, MenuItem>;
    itemPairs: Map<string, Map<string, number>>;
  } {
    const menuItems = new Map<string, MenuItem>();
    const itemPairs = new Map<string, Map<string, number>>();

    transactions.forEach(transaction => {
      const itemsInOrder = transaction.items;

      // Track individual items
      itemsInOrder.forEach((item: any) => {
        const key = this.normalizeItemName(item.name);

        if (!menuItems.has(key)) {
          menuItems.set(key, {
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.unitPrice,
            frequency: 0
          });
        }

        const menuItem = menuItems.get(key)!;
        menuItem.frequency += item.quantity;
      });

      // Track item pairs (what's ordered together)
      for (let i = 0; i < itemsInOrder.length; i++) {
        const item1 = this.normalizeItemName(itemsInOrder[i].name);

        for (let j = i + 1; j < itemsInOrder.length; j++) {
          const item2 = this.normalizeItemName(itemsInOrder[j].name);

          // Track both directions
          if (!itemPairs.has(item1)) {
            itemPairs.set(item1, new Map());
          }
          if (!itemPairs.has(item2)) {
            itemPairs.set(item2, new Map());
          }

          const pair1 = itemPairs.get(item1)!;
          const pair2 = itemPairs.get(item2)!;

          pair1.set(item2, (pair1.get(item2) || 0) + 1);
          pair2.set(item1, (pair2.get(item1) || 0) + 1);
        }
      }
    });

    return { menuItems, itemPairs };
  }

  /**
   * Find upsell opportunities based on actual order patterns
   */
  private async findUpsellOpportunities(
    transactions: any[],
    menuItems: Map<string, MenuItem>,
    itemPairs: Map<string, Map<string, number>>
  ): Promise<UpsellOpportunity[]> {
    const opportunities: UpsellOpportunity[] = [];

    // For each popular item, find its common companions
    for (const [itemName, item] of Array.from(menuItems.entries())) {
      if (item.frequency < 10) continue; // Need minimum data

      const companions = itemPairs.get(itemName);
      if (!companions) continue;

      // Find strongest companions (ordered together frequently)
      const companionArray = Array.from(companions.entries())
        .map(([companionName, count]) => ({
          item: menuItems.get(companionName)!,
          count,
          attachRate: count / item.frequency
        }))
        .filter(c => c.attachRate >= 0.20) // At least 20% attach rate
        .sort((a, b) => b.attachRate - a.attachRate);

      // Generate opportunities for top companions
      for (const companion of companionArray.slice(0, 3)) {
        const opportunity = await this.createUpsellOpportunity(
          item,
          companion.item,
          companion.attachRate,
          transactions,
          item.frequency
        );

        opportunities.push(opportunity);
      }
    }

    // Sort by revenue potential
    return opportunities.sort((a, b) =>
      b.revenueImpact.missedMonthly - a.revenueImpact.missedMonthly
    ).slice(0, 10); // Top 10 opportunities
  }

  /**
   * Create detailed upsell opportunity
   */
  private async createUpsellOpportunity(
    baseItem: MenuItem,
    suggestedItem: MenuItem,
    attachRate: number,
    transactions: any[],
    baseItemFrequency: number
  ): Promise<UpsellOpportunity> {
    // Count orders with base item
    const ordersWithBase = transactions.filter(t =>
      t.items.some((item: any) =>
        this.normalizeItemName(item.name) === this.normalizeItemName(baseItem.name)
      )
    );

    // Count how many of those also have the suggested item
    const ordersWithBoth = ordersWithBase.filter(t =>
      t.items.some((item: any) =>
        this.normalizeItemName(item.name) === this.normalizeItemName(suggestedItem.name)
      )
    );

    const ordersWithoutUpsell = ordersWithBase.length - ordersWithBoth.length;
    const missedPercentage = (ordersWithoutUpsell / ordersWithBase.length) * 100;

    // Calculate revenue impact
    const daysInPeriod = 30; // Assuming monthly
    const currentMonthlyUpsells = ordersWithBoth.length;
    const currentMonthlyRevenue = currentMonthlyUpsells * suggestedItem.price;
    const missedMonthlyRevenue = ordersWithoutUpsell * suggestedItem.price;
    const potentialAt50 = (ordersWithoutUpsell * 0.5) * suggestedItem.price;
    const potentialAt75 = (ordersWithoutUpsell * 0.75) * suggestedItem.price;

    // Create recommendation
    const recommendation = this.createRecommendation(
      baseItem,
      suggestedItem,
      attachRate,
      potentialAt50,
      potentialAt75
    );

    return {
      baseItem,
      suggestedItem,
      pattern: {
        description: `${Math.round(attachRate * 100)}% of customers who order ${baseItem.name} also order ${suggestedItem.name}`,
        confidence: Math.min(90, attachRate * 100 + 20), // Higher attach rate = higher confidence
        whenOrdered: `When customer orders ${baseItem.name}`,
        alsoOrdered: `${Math.round(attachRate * 100)}% also order ${suggestedItem.name}`,
        attachRate,
        sampleSize: baseItemFrequency
      },
      missedOpportunities: {
        totalBaseOrders: ordersWithBase.length,
        ordersWithUpsell: ordersWithBoth.length,
        ordersWithoutUpsell,
        missedCount: ordersWithoutUpsell,
        missedPercentage
      },
      revenueImpact: {
        currentMonthly: currentMonthlyRevenue,
        potentialMonthly: currentMonthlyRevenue + missedMonthlyRevenue,
        missedMonthly: missedMonthlyRevenue,
        ifUpsoldAt50Percent: currentMonthlyRevenue + potentialAt50,
        ifUpsoldAt75Percent: currentMonthlyRevenue + potentialAt75,
        perTransaction: suggestedItem.price
      },
      recommendation
    };
  }

  /**
   * Create actionable recommendation
   */
  private createRecommendation(
    baseItem: MenuItem,
    suggestedItem: MenuItem,
    attachRate: number,
    revenueAt50: number,
    revenueAt75: number
  ): UpsellOpportunity['recommendation'] {
    const attachPercent = Math.round(attachRate * 100);

    return {
      title: `Upsell ${suggestedItem.name} with ${baseItem.name}`,
      description: `${attachPercent}% of customers who order ${baseItem.name} also order ${suggestedItem.name}. This is a proven combination with high conversion potential.`,
      implementation: `
Train staff to ask: "Would you like to add ${suggestedItem.name} to your ${baseItem.name}?"

POS Prompts:
- Add automatic prompt when ${baseItem.name} is ordered
- Suggest: "${baseItem.name} + ${suggestedItem.name}" combo for $${(baseItem.price + suggestedItem.price * 0.9).toFixed(2)} (10% discount)

Menu Updates:
- Add "${baseItem.name} + ${suggestedItem.name} Combo" to menu
- Show as "Most Popular Pairing" or "Customers Also Love"

Expected Results:
- At 50% success rate: +$${revenueAt50.toFixed(0)}/month
- At 75% success rate: +$${revenueAt75.toFixed(0)}/month
      `.trim(),
      expectedRevenue: revenueAt50, // Conservative estimate
      difficulty: 'easy',
      timeframe: 'Immediate - implement today'
    };
  }

  /**
   * Find bundle opportunities (3+ items frequently ordered together)
   */
  private findBundleOpportunities(
    itemPairs: Map<string, Map<string, number>>,
    menuItems: Map<string, MenuItem>
  ): MenuInsights['bundleOpportunities'] {
    const bundles: MenuInsights['bundleOpportunities'] = [];

    // Look for items that are frequently ordered with multiple other items
    for (const [itemName, companions] of Array.from(itemPairs.entries())) {
      const item = menuItems.get(itemName);
      if (!item) continue;

      // Find pairs of companions that are also ordered together
      const companionArray = Array.from(companions.entries())
        .filter(([_, count]) => count >= 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (let i = 0; i < companionArray.length; i++) {
        for (let j = i + 1; j < companionArray.length; j++) {
          const comp1 = menuItems.get(companionArray[i][0]);
          const comp2 = menuItems.get(companionArray[j][0]);

          if (!comp1 || !comp2) continue;

          // Check if comp1 and comp2 are also ordered together
          const comp1Pairs = itemPairs.get(companionArray[i][0]);
          const comp2Count = comp1Pairs?.get(companionArray[j][0]) || 0;

          if (comp2Count >= 5) {
            // Found a bundle!
            const items = [item, comp1, comp2];
            const totalPrice = items.reduce((sum, i) => sum + i.price, 0);
            const bundlePrice = totalPrice * 0.85; // 15% discount
            const savings = totalPrice - bundlePrice;

            // Estimate frequency (minimum of the three pairs)
            const frequency = Math.min(
              companions.get(comp1.name) || 0,
              companions.get(comp2.name) || 0,
              comp2Count
            );

            bundles.push({
              items,
              frequency,
              bundlePrice,
              savings,
              potentialRevenue: frequency * savings * 4 // Monthly estimate
            });
          }
        }
      }
    }

    return bundles
      .sort((a, b) => b.potentialRevenue - a.potentialRevenue)
      .slice(0, 5);
  }

  /**
   * Get top performing items
   */
  private getTopItems(menuItems: Map<string, MenuItem>, limit: number): MenuItem[] {
    return Array.from(menuItems.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get underperforming items
   */
  private getUnderperformingItems(
    menuItems: Map<string, MenuItem>,
    topItems: MenuItem[]
  ): MenuItem[] {
    const avgFrequency = Array.from(menuItems.values())
      .reduce((sum, item) => sum + item.frequency, 0) / menuItems.size;

    const threshold = avgFrequency * 0.3; // 30% of average

    return Array.from(menuItems.values())
      .filter(item => item.frequency < threshold)
      .filter(item => !topItems.includes(item))
      .sort((a, b) => a.frequency - b.frequency)
      .slice(0, 10);
  }

  /**
   * Normalize item names for matching
   */
  private normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Generate menu optimization report
   */
  async generateMenuReport(restaurantId: string): Promise<{
    summary: string;
    topOpportunities: UpsellOpportunity[];
    quickWins: Array<{ description: string; revenue: number; difficulty: string }>;
    totalPotential: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const insights = await this.analyzeMenu(restaurantId, startDate, endDate);

    const totalPotential = insights.upsellOpportunities.reduce(
      (sum, opp) => sum + opp.revenueImpact.ifUpsoldAt50Percent,
      0
    );

    const quickWins = insights.upsellOpportunities
      .filter(opp => opp.recommendation.difficulty === 'easy')
      .slice(0, 5)
      .map(opp => ({
        description: opp.recommendation.title,
        revenue: opp.revenueImpact.ifUpsoldAt50Percent,
        difficulty: opp.recommendation.difficulty
      }));

    const summary = this.generateSummary(insights, totalPotential);

    return {
      summary,
      topOpportunities: insights.upsellOpportunities.slice(0, 5),
      quickWins,
      totalPotential
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(insights: MenuInsights, totalPotential: number): string {
    const topOpp = insights.upsellOpportunities[0];
    const bundleCount = insights.bundleOpportunities.length;

    return `
Found ${insights.upsellOpportunities.length} upsell opportunities worth $${totalPotential.toFixed(0)}/month.

Top Opportunity: ${topOpp.baseItem.name} → ${topOpp.suggestedItem.name}
- ${Math.round(topOpp.pattern.attachRate * 100)}% of customers already pair these items
- Missing $${topOpp.revenueImpact.missedMonthly.toFixed(0)}/month in potential revenue
- Quick fix: Train staff to suggest this pairing

Additional Findings:
- ${bundleCount} bundle opportunities identified
- ${insights.underperformingItems.length} underperforming items need attention
- Top 3 items drive ${Math.round((insights.topItems.slice(0, 3).reduce((sum, item) => sum + item.frequency, 0) / insights.topItems.reduce((sum, item) => sum + item.frequency, 0)) * 100)}% of menu sales
    `.trim();
  }
}

// Export singleton
export const menuAnalyticsService = new MenuAnalyticsService();
