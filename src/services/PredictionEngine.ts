/**
 * Prediction Engine
 *
 * Uses discovered correlations and patterns to forecast future performance.
 * Combines weather forecasts, upcoming events, historical patterns, and trends
 * to generate accurate predictions with confidence scores.
 */

import { Types } from 'mongoose';
import { Transaction, Restaurant } from '../models';
import Correlation from '../models/Correlation';
import { WeatherService } from './ExternalDataService';
import { internalPatternEngine } from './InternalPatternEngine';

export interface DayPrediction {
  date: Date;
  dayOfWeek: string;
  predictions: {
    revenue: {
      baseline: number;
      predicted: number;
      low: number;
      high: number;
      confidence: number;
    };
    traffic: {
      predicted: number;
      peakHours: string[];
    };
  };
  factors: PredictionFactor[];
  recommendations: string[];
}

export interface PredictionFactor {
  type: 'weather' | 'event' | 'temporal' | 'trend';
  description: string;
  impact: number; // Percentage
  confidence: number;
}

export interface WeekForecast {
  startDate: Date;
  endDate: Date;
  dailyPredictions: DayPrediction[];
  weekTotal: {
    revenue: number;
    confidence: number;
  };
  keyInsights: string[];
  actionItems: string[];
}

export class PredictionEngine {
  private weatherService: WeatherService;

  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * Generate 7-day forecast for a restaurant
   */
  async generateWeekForecast(restaurantId: string): Promise<WeekForecast> {
    console.log(`\n🔮 Generating 7-day forecast for ${restaurantId}...`);

    console.log('Step 1: Fetching restaurant...');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    console.log(`✅ Found restaurant: ${restaurant.name || 'Unknown'}`);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Get historical baseline
    console.log('Step 2: Calculating baseline from last 90 days...');
    const baseline = await this.calculateBaseline(restaurantId);
    console.log(`📊 Historical baseline: $${baseline.dailyAvg.toFixed(2)}/day`);

    // Get discovered correlations
    const correlations = await Correlation.find({
      $or: [
        { restaurantId: new Types.ObjectId(restaurantId) },
        { scope: 'global' }
      ],
      isActive: true
    });
    console.log(`✅ Found ${correlations.length} active correlations`);

    // Get weather forecasts if location available
    let weatherForecasts: any[] = [];
    if (restaurant.location?.latitude && restaurant.location?.longitude) {
      const lat = restaurant.location.latitude;
      const lng = restaurant.location.longitude;

      try {
        weatherForecasts = await this.weatherService.getWeatherForecast(lat, lng, 7);
        console.log(`✅ Got ${weatherForecasts.length} weather forecasts`);
      } catch (error: any) {
        console.log(`⚠️  Weather forecast unavailable: ${error.message}`);
      }
    } else {
      console.log('⚠️  No location coordinates - skipping weather forecast');
    }

    // Generate daily predictions
    const dailyPredictions: DayPrediction[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const prediction = await this.predictDay(
        restaurantId,
        date,
        baseline,
        correlations,
        weatherForecasts[i]
      );

      dailyPredictions.push(prediction);
    }

    // Calculate week total
    const weekRevenue = dailyPredictions.reduce((sum, day) => sum + day.predictions.revenue.predicted, 0);
    const avgConfidence = dailyPredictions.reduce((sum, day) => sum + day.predictions.revenue.confidence, 0) / 7;

    // Generate key insights
    const keyInsights = this.generateKeyInsights(dailyPredictions, baseline);
    const actionItems = this.generateActionItems(dailyPredictions);

    return {
      startDate,
      endDate,
      dailyPredictions,
      weekTotal: {
        revenue: weekRevenue,
        confidence: avgConfidence
      },
      keyInsights,
      actionItems
    };
  }

  /**
   * Predict a single day's performance
   */
  private async predictDay(
    restaurantId: string,
    date: Date,
    baseline: any,
    correlations: any[],
    weatherForecast?: any
  ): Promise<DayPrediction> {
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

    let predictedRevenue = baseline.dailyAvg;
    const factors: PredictionFactor[] = [];
    const recommendations: string[] = [];

    // Apply day-of-week pattern
    const dayPattern = baseline.dayPatterns[dayOfWeek];
    if (dayPattern) {
      const impact = ((dayPattern.avgRevenue - baseline.dailyAvg) / baseline.dailyAvg) * 100;
      predictedRevenue = dayPattern.avgRevenue;

      factors.push({
        type: 'temporal',
        description: `${dayOfWeek} historical pattern`,
        impact,
        confidence: 75
      });

      if (Math.abs(impact) > 15) {
        if (impact > 0) {
          recommendations.push(`${dayOfWeek} is a strong day (+${impact.toFixed(0)}%) - maximize staffing`);
        } else {
          recommendations.push(`${dayOfWeek} is typically slow (${impact.toFixed(0)}%) - consider promotions`);
        }
      }
    }

    // Apply weather correlations
    if (weatherForecast) {
      const weatherCorrelations = correlations.filter(c => c.type === 'weather_sales');

      for (const correlation of weatherCorrelations) {
        const temp = weatherForecast.temperature;
        const factor = correlation.externalFactor;

        if (factor.weatherCondition === 'temperature') {
          let applies = false;

          if (factor.value && factor.operator === 'above' && temp > factor.value) {
            applies = true;
          } else if (factor.value && factor.operator === 'below' && temp < factor.value) {
            applies = true;
          }

          if (applies) {
            const impact = correlation.businessOutcome.percentageChange || 0;
            predictedRevenue *= (1 + impact / 100);

            factors.push({
              type: 'weather',
              description: `Temperature ${temp.toFixed(0)}°F ${correlation.pattern.description}`,
              impact,
              confidence: correlation.statistics.confidence
            });

            if (Math.abs(impact) > 5) {
              recommendations.push(correlation.pattern.recommendation || `Weather impact: ${impact > 0 ? '+' : ''}${impact.toFixed(1)}%`);
            }
          }
        }
      }
    }

    // Apply trend
    if (baseline.trend !== 0) {
      const trendImpact = baseline.trend;
      predictedRevenue *= (1 + trendImpact / 100);

      factors.push({
        type: 'trend',
        description: `Overall ${trendImpact > 0 ? 'growth' : 'decline'} trend`,
        impact: trendImpact,
        confidence: 60
      });
    }

    // Calculate confidence and range
    const avgConfidence = factors.length > 0
      ? factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length
      : 50;

    const variance = 1 - (avgConfidence / 100);
    const low = predictedRevenue * (1 - variance * 0.2);
    const high = predictedRevenue * (1 + variance * 0.2);

    // Identify peak hours from historical data
    const peakHours = baseline.peakHours || ['12:00', '18:00'];

    return {
      date,
      dayOfWeek,
      predictions: {
        revenue: {
          baseline: baseline.dailyAvg,
          predicted: predictedRevenue,
          low,
          high,
          confidence: avgConfidence
        },
        traffic: {
          predicted: Math.round(predictedRevenue / baseline.avgTicket),
          peakHours
        }
      },
      factors,
      recommendations
    };
  }

  /**
   * Calculate historical baseline metrics using MongoDB aggregation (FAST!)
   */
  private async calculateBaseline(restaurantId: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`   Calculating baseline via aggregation (fast!)...`);

    // Use MongoDB aggregation - WAY faster than fetching all documents
    const stats = await Transaction.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId),
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $ifNull: ['$total', '$totalAmount'] } },
                count: { $sum: 1 }
              }
            }
          ],
          byDay: [
            {
              $group: {
                _id: { $dayOfWeek: '$transactionDate' },
                revenue: { $sum: { $ifNull: ['$total', '$totalAmount'] } },
                count: { $sum: 1 }
              }
            }
          ],
          byHour: [
            {
              $group: {
                _id: { $hour: '$transactionDate' },
                count: { $sum: 1 }
              }
            }
          ],
          trend: [
            { $sort: { transactionDate: 1 } },
            {
              $group: {
                _id: { $cond: { if: { $lt: ['$transactionDate', new Date((startDate.getTime() + endDate.getTime()) / 2)] }, then: 'first', else: 'second' } },
                revenue: { $sum: { $ifNull: ['$total', '$totalAmount'] } }
              }
            }
          ]
        }
      }
    ]);

    console.log(`   ✅ Aggregation complete`);

    const overall = stats[0].overall[0];
    if (!overall || overall.count === 0) {
      throw new Error('No transaction history available');
    }

    const totalRevenue = overall.totalRevenue;
    const count = overall.count;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAvg = totalRevenue / days;
    const avgTicket = totalRevenue / count;

    // Process day-of-week patterns from aggregation
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPatterns: Record<string, any> = {};

    stats[0].byDay.forEach((day: any) => {
      const dayName = dayNames[day._id - 1]; // MongoDB dayOfWeek is 1-7
      const weeksInPeriod = days / 7;
      dayPatterns[dayName] = {
        avgRevenue: day.revenue / Math.max(1, weeksInPeriod),
        avgTransactions: day.count / Math.max(1, weeksInPeriod)
      };
    });

    // Calculate trend from aggregation results
    const trendData = stats[0].trend;
    const firstHalf = trendData.find((t: any) => t._id === 'first')?.revenue || 0;
    const secondHalf = trendData.find((t: any) => t._id === 'second')?.revenue || 0;
    const trend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    // Find peak hours from aggregation
    const peakHours = stats[0].byHour
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 3)
      .map((h: any) => `${h._id}:00`);

    console.log(`   📊 Baseline: $${dailyAvg.toFixed(2)}/day, ${count} txs, ${trend > 0 ? '+' : ''}${trend.toFixed(1)}% trend`);

    return {
      dailyAvg,
      avgTicket,
      dayPatterns,
      trend,
      peakHours,
      totalTransactions: count
    };
  }

  /**
   * Generate key insights from predictions
   */
  private generateKeyInsights(predictions: DayPrediction[], baseline: any): string[] {
    const insights: string[] = [];

    // Find best day
    const bestDay = predictions.reduce((best, day) =>
      day.predictions.revenue.predicted > best.predictions.revenue.predicted ? day : best
    );
    const bestDayIncrease = ((bestDay.predictions.revenue.predicted - baseline.dailyAvg) / baseline.dailyAvg) * 100;

    if (bestDayIncrease > 10) {
      insights.push(`🎯 ${bestDay.dayOfWeek} is your best day this week (+${bestDayIncrease.toFixed(0)}% above average)`);
    }

    // Find weakest day
    const worstDay = predictions.reduce((worst, day) =>
      day.predictions.revenue.predicted < worst.predictions.revenue.predicted ? day : worst
    );
    const worstDayDecrease = ((baseline.dailyAvg - worstDay.predictions.revenue.predicted) / baseline.dailyAvg) * 100;

    if (worstDayDecrease > 10) {
      insights.push(`⚠️ ${worstDay.dayOfWeek} is slow this week (-${worstDayDecrease.toFixed(0)}% below average)`);
    }

    // Weather-impacted days
    const weatherDays = predictions.filter(p =>
      p.factors.some(f => f.type === 'weather' && Math.abs(f.impact) > 5)
    );

    if (weatherDays.length > 0) {
      insights.push(`🌤️ Weather will impact ${weatherDays.length} days this week`);
    }

    // Overall trend
    const weekTotal = predictions.reduce((sum, day) => sum + day.predictions.revenue.predicted, 0);
    const weekBaseline = baseline.dailyAvg * 7;
    const weekChange = ((weekTotal - weekBaseline) / weekBaseline) * 100;

    insights.push(`📈 Week forecast: $${weekTotal.toFixed(0)} (${weekChange > 0 ? '+' : ''}${weekChange.toFixed(1)}% vs baseline)`);

    return insights;
  }

  /**
   * Generate actionable items from predictions
   */
  private generateActionItems(predictions: DayPrediction[]): string[] {
    const actions: string[] = [];

    predictions.forEach(day => {
      const dayStr = `${day.dayOfWeek} ${day.date.getMonth() + 1}/${day.date.getDate()}`;

      // High revenue days
      const increase = ((day.predictions.revenue.predicted - day.predictions.revenue.baseline) / day.predictions.revenue.baseline) * 100;

      if (increase > 20) {
        actions.push(`✅ ${dayStr}: Expect high traffic (+${increase.toFixed(0)}%) - schedule extra staff at ${day.predictions.traffic.peakHours.join(', ')}`);
      }

      // Weather-specific actions
      const weatherFactors = day.factors.filter(f => f.type === 'weather');
      weatherFactors.forEach(factor => {
        if (Math.abs(factor.impact) > 5 && day.recommendations.length > 0) {
          actions.push(`🌤️ ${dayStr}: ${day.recommendations[0]}`);
        }
      });

      // Low traffic days
      if (increase < -15) {
        actions.push(`💡 ${dayStr}: Slow day predicted (${increase.toFixed(0)}%) - run promotions or special events`);
      }
    });

    return actions.slice(0, 5); // Top 5 most important actions
  }
}

export const predictionEngine = new PredictionEngine();
