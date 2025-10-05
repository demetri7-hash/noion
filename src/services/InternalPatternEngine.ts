/**
 * Internal Pattern Engine
 *
 * Advanced pattern detection using ONLY internal transaction data.
 * No external APIs required - this is the "money maker" of the platform.
 *
 * Discovers:
 * - Temporal patterns (day/week, time of day, seasonality)
 * - Employee performance patterns
 * - Menu item combinations and upsell opportunities
 * - Customer behavior patterns
 * - Revenue velocity and momentum
 * - Operational efficiency patterns
 */

import { Transaction } from '../models';
import { Types } from 'mongoose';

export interface TemporalPattern {
  type: 'day_of_week' | 'time_of_day' | 'week_of_month' | 'seasonal';
  pattern: string;
  description: string;
  confidence: number;
  impact: {
    revenueChange: number; // Percentage
    volumeChange: number;  // Percentage
  };
  recommendation: string;
  data: {
    baseline: number;
    peak: number;
    trough: number;
  };
}

export interface EmployeePattern {
  employeeId: string;
  employeeName: string;
  patterns: {
    avgTicketSize: number;
    upsellRate: number;
    avgCheckTime: number;
    peakHours: string[];
    specialties: string[]; // Menu items they sell most
  };
  performance: {
    rating: number; // 1-5
    revenuePerShift: number;
    customerSatisfaction: number;
  };
  recommendations: string[];
}

export interface MenuPattern {
  type: 'popular_combo' | 'upsell_opportunity' | 'dead_inventory' | 'margin_winner';
  items: string[];
  description: string;
  frequency: number;
  avgRevenue: number;
  recommendation: string;
}

export interface CustomerPattern {
  type: 'rush_hour' | 'slow_period' | 'party_size' | 'order_type';
  pattern: string;
  description: string;
  occurrences: number;
  impact: {
    revenue: number;
    efficiency: number;
  };
  recommendation: string;
}

export interface RevenueVelocity {
  current: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  trend: 'accelerating' | 'steady' | 'decelerating';
  prediction: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
  insights: string[];
}

export class InternalPatternEngine {
  /**
   * Discover ALL internal patterns for a restaurant
   */
  async discoverPatterns(restaurantId: string, startDate: Date, endDate: Date) {
    console.log(`\n🔍 Discovering internal patterns for ${restaurantId}...`);

    const transactions = await Transaction.find({
      restaurantId: new Types.ObjectId(restaurantId),
      transactionDate: { $gte: startDate, $lte: endDate }
    }).lean();

    console.log(`📊 Analyzing ${transactions.length} transactions...`);

    const results = {
      temporal: await this.analyzeTemporalPatterns(transactions),
      employees: await this.analyzeEmployeePatterns(transactions),
      menu: await this.analyzeMenuPatterns(transactions),
      customers: await this.analyzeCustomerPatterns(transactions),
      velocity: await this.analyzeRevenueVelocity(transactions)
    };

    return results;
  }

  /**
   * Temporal Patterns - Day/Week/Time Analysis
   */
  private async analyzeTemporalPatterns(transactions: any[]): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];

    // Day of Week Analysis
    const dayBuckets = this.groupByDayOfWeek(transactions);
    const avgRevenue = this.calculateAverage(
      Object.values(dayBuckets).map(txs => this.sumRevenue(txs))
    );

    for (const [day, txs] of Object.entries(dayBuckets)) {
      const dayRevenue = this.sumRevenue(txs);
      const change = ((dayRevenue - avgRevenue) / avgRevenue) * 100;

      if (Math.abs(change) > 10) { // Significant pattern (>10% difference)
        patterns.push({
          type: 'day_of_week',
          pattern: `${day}s`,
          description: `${day}s are ${change > 0 ? 'strong' : 'weak'} days`,
          confidence: Math.min(95, 50 + Math.abs(change)),
          impact: {
            revenueChange: change,
            volumeChange: ((txs.length - transactions.length / 7) / (transactions.length / 7)) * 100
          },
          recommendation: change > 0
            ? `Maximize ${day} staffing and inventory for peak performance`
            : `Run promotions on ${day}s to boost sales`,
          data: {
            baseline: avgRevenue,
            peak: Math.max(...Object.values(dayBuckets).map(t => this.sumRevenue(t))),
            trough: Math.min(...Object.values(dayBuckets).map(t => this.sumRevenue(t)))
          }
        });
      }
    }

    // Time of Day Analysis
    const hourBuckets = this.groupByHour(transactions);
    const peakHour = Object.entries(hourBuckets)
      .sort(([, a], [, b]) => this.sumRevenue(b) - this.sumRevenue(a))[0];

    if (peakHour) {
      const [hour, txs] = peakHour;
      const peakRevenue = this.sumRevenue(txs);
      const avgHourRevenue = this.calculateAverage(
        Object.values(hourBuckets).map(t => this.sumRevenue(t))
      );
      const change = ((peakRevenue - avgHourRevenue) / avgHourRevenue) * 100;

      patterns.push({
        type: 'time_of_day',
        pattern: `${hour}:00 - ${parseInt(hour) + 1}:00`,
        description: `Peak hour is ${hour}:00 with ${change.toFixed(0)}% above average`,
        confidence: 85,
        impact: {
          revenueChange: change,
          volumeChange: ((txs.length - transactions.length / 24) / (transactions.length / 24)) * 100
        },
        recommendation: `Ensure maximum staffing at ${hour}:00. This is your prime revenue window.`,
        data: {
          baseline: avgHourRevenue,
          peak: peakRevenue,
          trough: Math.min(...Object.values(hourBuckets).map(t => this.sumRevenue(t)))
        }
      });
    }

    return patterns;
  }

  /**
   * Employee Performance Patterns
   */
  private async analyzeEmployeePatterns(transactions: any[]): Promise<EmployeePattern[]> {
    const employeeBuckets = this.groupByEmployee(transactions);
    const patterns: EmployeePattern[] = [];

    for (const [employeeId, txs] of Object.entries(employeeBuckets)) {
      const avgTicket = this.sumRevenue(txs) / txs.length;
      const overallAvg = this.sumRevenue(transactions) / transactions.length;

      // Find employee's peak hours
      const hourBuckets = this.groupByHour(txs);
      const peakHours = Object.entries(hourBuckets)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`);

      // Find their specialties (top selling items)
      const itemCounts: Record<string, number> = {};
      txs.forEach(tx => {
        tx.items?.forEach((item: any) => {
          const name = item.name || item.itemName || 'Unknown';
          itemCounts[name] = (itemCounts[name] || 0) + 1;
        });
      });

      const specialties = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name]) => name);

      const performance = avgTicket / overallAvg;
      const rating = Math.min(5, Math.max(1, 2.5 + (performance - 1) * 2));

      const recommendations = [];
      if (performance > 1.1) {
        recommendations.push(`⭐ Top performer! ${((performance - 1) * 100).toFixed(0)}% above average ticket size`);
        recommendations.push(`Share their techniques with team`);
      } else if (performance < 0.9) {
        recommendations.push(`Needs upselling training - tickets ${((1 - performance) * 100).toFixed(0)}% below average`);
        recommendations.push(`Pair with top performer for mentoring`);
      }

      if (peakHours.length > 0) {
        recommendations.push(`Most effective during: ${peakHours.join(', ')}`);
      }

      patterns.push({
        employeeId,
        employeeName: txs[0]?.employee?.name || 'Unknown',
        patterns: {
          avgTicketSize: avgTicket,
          upsellRate: performance > 1 ? (performance - 1) * 100 : 0,
          avgCheckTime: 0, // Would need timing data
          peakHours,
          specialties
        },
        performance: {
          rating,
          revenuePerShift: this.sumRevenue(txs) / Math.ceil(txs.length / 20), // Approx shifts
          customerSatisfaction: 0 // Would need review data
        },
        recommendations
      });
    }

    return patterns.sort((a, b) => b.performance.rating - a.performance.rating);
  }

  /**
   * Menu Item Patterns
   */
  private async analyzeMenuPatterns(transactions: any[]): Promise<MenuPattern[]> {
    const patterns: MenuPattern[] = [];

    // Item combination analysis
    const combos: Record<string, { count: number; revenue: number }> = {};

    transactions.forEach(tx => {
      if (tx.items && tx.items.length > 1) {
        const items = tx.items.map((i: any) => i.name || i.itemName || 'Unknown').sort();
        const key = items.join(' + ');

        if (!combos[key]) {
          combos[key] = { count: 0, revenue: 0 };
        }
        combos[key].count++;
        combos[key].revenue += tx.total || tx.totalAmount || tx.amount || 0;
      }
    });

    // Find popular combos
    const popularCombos = Object.entries(combos)
      .filter(([, data]) => data.count >= 5) // At least 5 occurrences
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    popularCombos.forEach(([combo, data]) => {
      const items = combo.split(' + ');
      patterns.push({
        type: 'popular_combo',
        items,
        description: `${items.join(' + ')} ordered together ${data.count} times`,
        frequency: data.count,
        avgRevenue: data.revenue / data.count,
        recommendation: `Create a combo meal featuring these items at slight discount to boost volume`
      });
    });

    // Find upsell opportunities
    const itemFrequency: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.items?.forEach((item: any) => {
        const name = item.name || item.itemName || 'Unknown';
        itemFrequency[name] = (itemFrequency[name] || 0) + 1;
      });
    });

    const totalTransactions = transactions.length;
    Object.entries(itemFrequency).forEach(([item, count]) => {
      const attachRate = count / totalTransactions;
      if (attachRate < 0.2 && attachRate > 0.05) { // Low but not dead
        patterns.push({
          type: 'upsell_opportunity',
          items: [item],
          description: `${item} appears in only ${(attachRate * 100).toFixed(1)}% of orders`,
          frequency: count,
          avgRevenue: 0,
          recommendation: `Train staff to suggest ${item} - huge upsell potential`
        });
      }
    });

    return patterns;
  }

  /**
   * Customer Behavior Patterns
   */
  private async analyzeCustomerPatterns(transactions: any[]): Promise<CustomerPattern[]> {
    const patterns: CustomerPattern[] = [];

    // Rush hour detection
    const hourBuckets = this.groupByHour(transactions);
    const avgPerHour = transactions.length / 24;

    Object.entries(hourBuckets).forEach(([hour, txs]) => {
      if (txs.length > avgPerHour * 1.5) {
        patterns.push({
          type: 'rush_hour',
          pattern: `${hour}:00`,
          description: `${hour}:00 is a rush hour with ${txs.length} transactions (${((txs.length / avgPerHour - 1) * 100).toFixed(0)}% above average)`,
          occurrences: txs.length,
          impact: {
            revenue: this.sumRevenue(txs),
            efficiency: 100 - (txs.length / avgPerHour - 1) * 20 // Lower efficiency during rush
          },
          recommendation: `Staff up at ${parseInt(hour) - 1}:00 to prepare for rush. Consider express ordering.`
        });
      }
    });

    return patterns;
  }

  /**
   * Revenue Velocity & Momentum
   */
  private async analyzeRevenueVelocity(transactions: any[]): Promise<RevenueVelocity> {
    const sortedTxs = transactions.sort((a, b) =>
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    const totalRevenue = this.sumRevenue(transactions);
    const days = Math.ceil(
      (new Date(sortedTxs[sortedTxs.length - 1].transactionDate).getTime() -
        new Date(sortedTxs[0].transactionDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const dailyAvg = totalRevenue / days;
    const weeklyAvg = dailyAvg * 7;
    const monthlyAvg = dailyAvg * 30;

    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(transactions.length / 2);
    const firstHalf = this.sumRevenue(sortedTxs.slice(0, midpoint));
    const secondHalf = this.sumRevenue(sortedTxs.slice(midpoint));
    const growth = (secondHalf - firstHalf) / firstHalf;

    let trend: 'accelerating' | 'steady' | 'decelerating';
    if (growth > 0.05) trend = 'accelerating';
    else if (growth < -0.05) trend = 'decelerating';
    else trend = 'steady';

    const insights: string[] = [];
    insights.push(`Current daily velocity: $${dailyAvg.toFixed(0)}`);
    insights.push(`Trend: ${trend} (${(growth * 100).toFixed(1)}% ${growth > 0 ? 'growth' : 'decline'})`);

    if (trend === 'accelerating') {
      insights.push(`🚀 Revenue accelerating! Keep momentum with current strategies`);
    } else if (trend === 'decelerating') {
      insights.push(`⚠️ Revenue slowing. Review recent changes and adjust course`);
    }

    return {
      current: {
        daily: dailyAvg,
        weekly: weeklyAvg,
        monthly: monthlyAvg
      },
      trend,
      prediction: {
        nextWeek: weeklyAvg * (1 + growth),
        nextMonth: monthlyAvg * (1 + growth),
        confidence: 70 + Math.abs(growth) * 100
      },
      insights
    };
  }

  // Helper methods
  private groupByDayOfWeek(transactions: any[]): Record<string, any[]> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const buckets: Record<string, any[]> = {};
    days.forEach(d => buckets[d] = []);

    transactions.forEach(tx => {
      const day = new Date(tx.transactionDate).getDay();
      buckets[days[day]].push(tx);
    });

    return buckets;
  }

  private groupByHour(transactions: any[]): Record<string, any[]> {
    const buckets: Record<string, any[]> = {};
    for (let i = 0; i < 24; i++) {
      buckets[i.toString()] = [];
    }

    transactions.forEach(tx => {
      const hour = new Date(tx.transactionDate).getHours();
      buckets[hour.toString()].push(tx);
    });

    return buckets;
  }

  private groupByEmployee(transactions: any[]): Record<string, any[]> {
    const buckets: Record<string, any[]> = {};

    transactions.forEach(tx => {
      const empId = tx.employee?.id || tx.employeeId || 'unknown';
      if (!buckets[empId]) buckets[empId] = [];
      buckets[empId].push(tx);
    });

    return buckets;
  }

  private sumRevenue(transactions: any[]): number {
    return transactions.reduce((sum, tx) =>
      sum + (tx.total || tx.totalAmount || tx.amount || 0), 0
    );
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

export const internalPatternEngine = new InternalPatternEngine();
