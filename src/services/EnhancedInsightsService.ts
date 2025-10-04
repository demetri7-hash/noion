import { weatherService, eventsService, holidayService } from './ExternalDataService';
import { locationService } from './LocationService';
import { correlationEngine, Prediction } from './CorrelationEngine';
import { InsightGeneratorService } from './InsightGenerator';
import Restaurant from '../models/Restaurant';
import Transaction from '../models/Transaction';
import { IKeyFinding, IRecommendation, InsightCategory, InsightPriority } from '../models/Insight';

/**
 * Enhanced Insights Service
 * Combines external data, correlations, and AI to generate intelligent insights
 * Gets smarter with more restaurant data
 */

export interface EnhancedInsight {
  // Standard insights
  findings: IKeyFinding[];
  recommendations: IRecommendation[];

  // External factors
  contextualFactors: {
    weather?: {
      current: any;
      forecast: any[];
      impact: string;
    };
    upcomingEvents?: Array<{
      event: any;
      impact: string;
      recommendation: string;
    }>;
    upcomingHolidays?: Array<{
      holiday: any;
      impact: string;
      recommendation: string;
    }>;
  };

  // Predictions
  predictions: Prediction[];

  // Learning insights
  patterns: Array<{
    description: string;
    confidence: number;
    basedOnRestaurants: number;
    accuracy: number;
  }>;
}

export class EnhancedInsightsService extends InsightGeneratorService {
  /**
   * Generate enhanced insights with external data and predictions
   */
  async generateEnhancedInsights(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnhancedInsight> {
    console.log(`Generating enhanced insights for restaurant ${restaurantId}`);

    // Get restaurant and location
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const location = await locationService.getRestaurantLocation(restaurantId);
    if (!location) {
      throw new Error('Could not determine restaurant location');
    }

    // Run correlation analysis
    await correlationEngine.discoverCorrelations(restaurantId, startDate, endDate);

    // Get standard insights
    const baseInsight = await this.generateInsights(
      restaurantId,
      startDate,
      endDate
    );

    // Get external factors
    const contextualFactors = await this.getContextualFactors(location);

    // Get predictions
    const predictions = await this.getPredictions(restaurantId, location, contextualFactors);

    // Get learned patterns
    const patterns = await this.getLearnedPatterns(restaurantId, location);

    // Generate enhanced recommendations based on all data
    const enhancedRecommendations = await this.generateEnhancedRecommendations(
      baseInsight,
      contextualFactors,
      predictions,
      patterns
    );

    // Generate enhanced findings
    const enhancedFindings = await this.generateEnhancedFindings(
      baseInsight,
      contextualFactors,
      predictions
    );

    return {
      findings: enhancedFindings,
      recommendations: enhancedRecommendations,
      contextualFactors,
      predictions,
      patterns
    };
  }

  /**
   * Get contextual factors (weather, events, holidays)
   */
  private async getContextualFactors(location: any) {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get weather
    const currentWeather = await weatherService.getCurrentWeather(
      location.latitude,
      location.longitude
    );

    const weatherForecast = await weatherService.getWeatherForecast(
      location.latitude,
      location.longitude,
      7
    );

    // Get upcoming events
    const events = await eventsService.getLocalEvents(
      location.latitude,
      location.longitude,
      5, // 5 mile radius
      now,
      oneWeekLater
    );

    // Get upcoming holidays
    const holidays = holidayService.getUpcomingHolidays(5);

    return {
      weather: {
        current: currentWeather,
        forecast: weatherForecast,
        impact: this.analyzeWeatherImpact(currentWeather, weatherForecast)
      },
      upcomingEvents: events
        .filter(e => e.impactLevel === 'high' || e.impactLevel === 'critical')
        .map(event => ({
          event,
          impact: this.analyzeEventImpact(event),
          recommendation: this.getEventRecommendation(event)
        })),
      upcomingHolidays: holidays.map(holiday => ({
        holiday,
        impact: this.analyzeHolidayImpact(holiday),
        recommendation: this.getHolidayRecommendation(holiday)
      }))
    };
  }

  /**
   * Get predictions for upcoming period
   */
  private async getPredictions(
    restaurantId: string,
    location: any,
    contextualFactors: any
  ): Promise<Prediction[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await correlationEngine.predict({
      restaurantId,
      date: tomorrow,
      weather: contextualFactors.weather?.current,
      events: contextualFactors.upcomingEvents?.map((e: any) => e.event),
      holiday: contextualFactors.upcomingHolidays?.[0]?.holiday
    });
  }

  /**
   * Get learned patterns for this restaurant
   */
  private async getLearnedPatterns(restaurantId: string, location: any) {
    const Correlation = (await import('../models/Correlation')).default;

    const region = locationService.getRegion(location.state);
    const restaurant = await Restaurant.findById(restaurantId);
    const cuisineType = restaurant?.type || 'casual_dining';

    const patterns = await Correlation.findForRestaurant(
      restaurantId,
      region,
      cuisineType
    );

    return patterns.slice(0, 5).map((p: any) => ({
      description: p.pattern.description,
      confidence: p.confidence,
      basedOnRestaurants: p.learning.restaurantsContributing,
      accuracy: p.learning.accuracy
    }));
  }

  /**
   * Generate enhanced findings with external context
   */
  private async generateEnhancedFindings(
    baseInsight: any,
    contextualFactors: any,
    predictions: Prediction[]
  ): Promise<IKeyFinding[]> {
    const findings: IKeyFinding[] = [...baseInsight.keyFindings];

    // Add weather-based finding if significant
    if (contextualFactors.weather?.current) {
      const weather = contextualFactors.weather.current;

      if (weather.weatherCategory === 'severe') {
        findings.push({
          category: InsightCategory.OPERATIONAL_EFFICIENCY,
          title: 'Severe Weather Alert',
          description: `${weather.description} expected. Temperature: ${weather.temperature.toFixed(0)}°F. This may significantly impact traffic.`,
          impact: {
            type: 'revenue',
            value: -500, // Estimated impact
            unit: '$',
            timeframe: 'daily'
          },
          evidence: {
            dataPoints: [
              {
                metric: 'Weather Condition',
                value: weather.temperature,
                benchmark: 70
              }
            ],
            trends: []
          },
          confidenceScore: 85,
          priority: InsightPriority.HIGH
        });
      } else if (weather.weatherCategory === 'excellent') {
        findings.push({
          category: InsightCategory.REVENUE_OPTIMIZATION,
          title: 'Excellent Weather Opportunity',
          description: `Perfect weather conditions (${weather.temperature.toFixed(0)}°F, ${weather.description}). Ideal for outdoor dining and high traffic.`,
          impact: {
            type: 'revenue',
            value: 300,
            unit: '$',
            timeframe: 'daily'
          },
          evidence: {
            dataPoints: [
              {
                metric: 'Weather Quality',
                value: 95,
                benchmark: 70
              }
            ],
            trends: []
          },
          confidenceScore: 80,
          priority: InsightPriority.MEDIUM
        });
      }
    }

    // Add event-based findings
    if (contextualFactors.upcomingEvents && contextualFactors.upcomingEvents.length > 0) {
      const majorEvent = contextualFactors.upcomingEvents[0];

      findings.push({
        category: InsightCategory.REVENUE_OPTIMIZATION,
        title: `Major Event: ${majorEvent.event.name}`,
        description: `${majorEvent.event.name} (${majorEvent.event.expectedAttendance.toLocaleString()} expected) is ${majorEvent.event.distance.toFixed(1)} miles away. ${majorEvent.impact}`,
        impact: {
          type: 'revenue',
          value: majorEvent.event.expectedAttendance * 0.05, // Estimate
          unit: '$',
          timeframe: 'daily'
        },
        evidence: {
          dataPoints: [
            {
              metric: 'Event Attendance',
              value: majorEvent.event.expectedAttendance
            },
            {
              metric: 'Distance',
              value: majorEvent.event.distance
            }
          ],
          trends: []
        },
        confidenceScore: 75,
        priority: InsightPriority.HIGH
      });
    }

    // Add prediction-based findings
    predictions.forEach(pred => {
      if (Math.abs(pred.change) > 15) {
        findings.push({
          category: InsightCategory.PEAK_HOUR_ANALYSIS,
          title: `Predicted ${pred.metric} ${pred.change > 0 ? 'Increase' : 'Decrease'}`,
          description: `Our AI predicts ${pred.metric} will ${pred.change > 0 ? 'increase' : 'decrease'} by ${Math.abs(pred.change).toFixed(1)}% based on ${pred.factors.length} external factors.`,
          impact: {
            type: 'revenue',
            value: pred.predictedValue - pred.baseline,
            unit: '$',
            timeframe: 'daily'
          },
          evidence: {
            dataPoints: pred.factors.map(f => ({
              metric: f.type,
              value: f.impact
            })),
            trends: []
          },
          confidenceScore: pred.confidence,
          priority: Math.abs(pred.change) > 30 ? InsightPriority.HIGH : InsightPriority.MEDIUM
        });
      }
    });

    return findings;
  }

  /**
   * Generate enhanced recommendations
   */
  private async generateEnhancedRecommendations(
    baseInsight: any,
    contextualFactors: any,
    predictions: Prediction[],
    patterns: any[]
  ): Promise<IRecommendation[]> {
    const recommendations: IRecommendation[] = [...baseInsight.recommendations];

    // Weather-based recommendations
    if (contextualFactors.weather?.current) {
      const weather = contextualFactors.weather.current;

      if (weather.isRaining) {
        recommendations.push({
          id: `rec_weather_rain_${Date.now()}`,
          title: 'Rainy Weather Strategy',
          description: 'Rain is forecasted. Implement delivery/takeout promotions and comfort food specials.',
          category: InsightCategory.REVENUE_OPTIMIZATION,
          priority: InsightPriority.MEDIUM,
          implementation: {
            difficulty: 'easy',
            timeRequired: '2 hours',
            cost: 100,
            roi: {
              timeframe: '1 day',
              expectedReturn: 400,
              probability: 70
            }
          },
          steps: [
            {
              stepNumber: 1,
              description: 'Promote delivery/takeout via social media',
              estimatedTime: '30 minutes'
            },
            {
              stepNumber: 2,
              description: 'Create comfort food specials (soup, hot drinks)',
              estimatedTime: '1 hour'
            },
            {
              stepNumber: 3,
              description: 'Offer rain day discount code',
              estimatedTime: '30 minutes'
            }
          ],
          metrics: {
            kpis: ['Delivery orders', 'Takeout revenue', 'Hot beverage sales'],
            trackingMethod: 'POS daily reports',
            expectedImprovement: '20-30% increase in delivery/takeout'
          },
          status: 'suggested'
        });
      }

      if (weather.temperature > 85) {
        recommendations.push({
          id: `rec_weather_hot_${Date.now()}`,
          title: 'Hot Weather Optimization',
          description: 'High temperatures expected. Promote cold beverages, outdoor seating, and light menu items.',
          category: InsightCategory.MENU_OPTIMIZATION,
          priority: InsightPriority.MEDIUM,
          implementation: {
            difficulty: 'easy',
            timeRequired: '1 hour',
            cost: 50,
            roi: {
              timeframe: '1 day',
              expectedReturn: 300,
              probability: 75
            }
          },
          steps: [
            {
              stepNumber: 1,
              description: 'Feature cold drinks and frozen desserts',
              estimatedTime: '20 minutes'
            },
            {
              stepNumber: 2,
              description: 'Promote outdoor seating',
              estimatedTime: '20 minutes'
            },
            {
              stepNumber: 3,
              description: 'Create summer specials menu',
              estimatedTime: '20 minutes'
            }
          ],
          metrics: {
            kpis: ['Cold beverage sales', 'Outdoor seating utilization', 'Light entree sales'],
            trackingMethod: 'POS category tracking',
            expectedImprovement: '25-40% increase in cold drinks'
          },
          status: 'suggested'
        });
      }
    }

    // Event-based recommendations
    contextualFactors.upcomingEvents?.forEach((eventData: any) => {
      recommendations.push({
        id: `rec_event_${eventData.event.id}`,
        title: `Event Strategy: ${eventData.event.name}`,
        description: eventData.recommendation,
        category: InsightCategory.REVENUE_OPTIMIZATION,
        priority: eventData.event.impactLevel === 'critical' ? InsightPriority.CRITICAL : InsightPriority.HIGH,
        implementation: {
          difficulty: 'medium',
          timeRequired: '3 days',
          cost: 500,
          roi: {
            timeframe: '1 day',
            expectedReturn: eventData.event.expectedAttendance * 0.1,
            probability: 80
          }
        },
        steps: [
          {
            stepNumber: 1,
            description: 'Increase inventory for expected surge',
            estimatedTime: '1 day'
          },
          {
            stepNumber: 2,
            description: 'Add extra staff for event day',
            estimatedTime: '1 day'
          },
          {
            stepNumber: 3,
            description: 'Create event-specific promotions',
            estimatedTime: '1 day'
          }
        ],
        metrics: {
          kpis: ['Event day revenue', 'Customer count', 'Table turns'],
          trackingMethod: 'POS event day analysis',
          expectedImprovement: `${((eventData.event.expectedAttendance * 0.1) / 1000 * 100).toFixed(0)}% revenue increase`
        },
        status: 'suggested'
      });
    });

    return recommendations;
  }

  private analyzeWeatherImpact(current: any, forecast: any[]): string {
    if (!current) return 'Unable to assess weather impact';

    if (current.weatherCategory === 'severe') {
      return 'Severe weather may significantly reduce foot traffic. Plan for lower dine-in, higher delivery demand.';
    } else if (current.weatherCategory === 'excellent') {
      return 'Excellent weather conditions favor outdoor dining and increased foot traffic.';
    } else if (current.isRaining) {
      return 'Rain expected. Delivery and takeout likely to increase while dine-in may decrease.';
    }

    return 'Normal weather conditions expected.';
  }

  private analyzeEventImpact(event: any): string {
    if (event.distance < 0.5) {
      return `Very close proximity (${event.distance.toFixed(1)} mi) - expect major traffic impact`;
    } else if (event.distance < 2) {
      return `Close proximity (${event.distance.toFixed(1)} mi) - significant traffic expected`;
    }
    return `Moderate distance (${event.distance.toFixed(1)} mi) - some impact on traffic`;
  }

  private getEventRecommendation(event: any): string {
    const strategies: string[] = [];

    if (event.distance < 1) {
      strategies.push('Add extra staff');
      strategies.push('Extend operating hours');
    }

    if (event.category === 'sports') {
      strategies.push('Offer game-watching specials');
      strategies.push('Promote group reservations');
    }

    if (event.expectedAttendance > 5000) {
      strategies.push('Increase inventory by 50%');
      strategies.push('Activate overflow seating');
    }

    return strategies.join('. ');
  }

  private analyzeHolidayImpact(holiday: any): string {
    return `${holiday.name} typically shows ${holiday.diningImpact} impact on restaurant traffic. ${holiday.typicalBehavior}`;
  }

  private getHolidayRecommendation(holiday: any): string {
    if (holiday.diningImpact === 'very_positive') {
      return 'Accept reservations, increase staff, extend hours, create special menu';
    } else if (holiday.diningImpact === 'positive') {
      return 'Moderate staffing increase, promote family dining specials';
    } else if (holiday.diningImpact === 'negative') {
      return 'Consider reduced hours or closure, focus on takeout/catering';
    }
    return 'Maintain normal operations';
  }
}

// Export singleton
export const enhancedInsightsService = new EnhancedInsightsService();
