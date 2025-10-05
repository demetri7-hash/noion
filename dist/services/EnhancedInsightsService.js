"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedInsightsService = exports.EnhancedInsightsService = void 0;
const ExternalDataService_1 = require("./ExternalDataService");
const LocationService_1 = require("./LocationService");
const CorrelationEngine_1 = require("./CorrelationEngine");
const InsightGenerator_1 = require("./InsightGenerator");
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Insight_1 = require("../models/Insight");
class EnhancedInsightsService extends InsightGenerator_1.InsightGeneratorService {
    /**
     * Generate enhanced insights with external data and predictions
     */
    async generateEnhancedInsights(restaurantId, startDate, endDate) {
        console.log(`Generating enhanced insights for restaurant ${restaurantId}`);
        // Get restaurant and location
        const restaurant = await Restaurant_1.default.findById(restaurantId);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }
        const location = await LocationService_1.locationService.getRestaurantLocation(restaurantId);
        if (!location) {
            throw new Error('Could not determine restaurant location');
        }
        // Run correlation analysis
        await CorrelationEngine_1.correlationEngine.discoverCorrelations(restaurantId, startDate, endDate);
        // Get standard insights
        const baseInsight = await this.generateInsights(restaurantId, startDate, endDate);
        // Get external factors
        const contextualFactors = await this.getContextualFactors(location);
        // Get predictions
        const predictions = await this.getPredictions(restaurantId, location, contextualFactors);
        // Get learned patterns
        const patterns = await this.getLearnedPatterns(restaurantId, location);
        // Generate enhanced recommendations based on all data
        const enhancedRecommendations = await this.generateEnhancedRecommendations(baseInsight, contextualFactors, predictions, patterns);
        // Generate enhanced findings
        const enhancedFindings = await this.generateEnhancedFindings(baseInsight, contextualFactors, predictions);
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
    async getContextualFactors(location) {
        const now = new Date();
        const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        // Get weather
        const currentWeather = await ExternalDataService_1.weatherService.getCurrentWeather(location.latitude, location.longitude);
        const weatherForecast = await ExternalDataService_1.weatherService.getWeatherForecast(location.latitude, location.longitude, 7);
        // Get upcoming events
        const events = await ExternalDataService_1.eventsService.getLocalEvents(location.latitude, location.longitude, 5, // 5 mile radius
        now, oneWeekLater);
        // Get upcoming holidays
        const holidays = ExternalDataService_1.holidayService.getUpcomingHolidays(5);
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
    async getPredictions(restaurantId, location, contextualFactors) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return await CorrelationEngine_1.correlationEngine.predict({
            restaurantId,
            date: tomorrow,
            weather: contextualFactors.weather?.current,
            events: contextualFactors.upcomingEvents?.map((e) => e.event),
            holiday: contextualFactors.upcomingHolidays?.[0]?.holiday
        });
    }
    /**
     * Get learned patterns for this restaurant
     */
    async getLearnedPatterns(restaurantId, location) {
        const Correlation = (await Promise.resolve().then(() => __importStar(require('../models/Correlation')))).default;
        const region = LocationService_1.locationService.getRegion(location.state);
        const restaurant = await Restaurant_1.default.findById(restaurantId);
        const cuisineType = restaurant?.type || 'casual_dining';
        const patterns = await Correlation.findForRestaurant(restaurantId, region, cuisineType);
        return patterns.slice(0, 5).map((p) => ({
            description: p.pattern.description,
            confidence: p.confidence,
            basedOnRestaurants: p.learning.restaurantsContributing,
            accuracy: p.learning.accuracy
        }));
    }
    /**
     * Generate enhanced findings with external context
     */
    async generateEnhancedFindings(baseInsight, contextualFactors, predictions) {
        const findings = [...baseInsight.keyFindings];
        // Add weather-based finding if significant
        if (contextualFactors.weather?.current) {
            const weather = contextualFactors.weather.current;
            if (weather.weatherCategory === 'severe') {
                findings.push({
                    category: Insight_1.InsightCategory.OPERATIONAL_EFFICIENCY,
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
                    priority: Insight_1.InsightPriority.HIGH
                });
            }
            else if (weather.weatherCategory === 'excellent') {
                findings.push({
                    category: Insight_1.InsightCategory.REVENUE_OPTIMIZATION,
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
                    priority: Insight_1.InsightPriority.MEDIUM
                });
            }
        }
        // Add event-based findings
        if (contextualFactors.upcomingEvents && contextualFactors.upcomingEvents.length > 0) {
            const majorEvent = contextualFactors.upcomingEvents[0];
            findings.push({
                category: Insight_1.InsightCategory.REVENUE_OPTIMIZATION,
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
                priority: Insight_1.InsightPriority.HIGH
            });
        }
        // Add prediction-based findings
        predictions.forEach(pred => {
            if (Math.abs(pred.change) > 15) {
                findings.push({
                    category: Insight_1.InsightCategory.PEAK_HOUR_ANALYSIS,
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
                    priority: Math.abs(pred.change) > 30 ? Insight_1.InsightPriority.HIGH : Insight_1.InsightPriority.MEDIUM
                });
            }
        });
        return findings;
    }
    /**
     * Generate enhanced recommendations
     */
    async generateEnhancedRecommendations(baseInsight, contextualFactors, predictions, patterns) {
        const recommendations = [...baseInsight.recommendations];
        // Weather-based recommendations
        if (contextualFactors.weather?.current) {
            const weather = contextualFactors.weather.current;
            if (weather.isRaining) {
                recommendations.push({
                    id: `rec_weather_rain_${Date.now()}`,
                    title: 'Rainy Weather Strategy',
                    description: 'Rain is forecasted. Implement delivery/takeout promotions and comfort food specials.',
                    category: Insight_1.InsightCategory.REVENUE_OPTIMIZATION,
                    priority: Insight_1.InsightPriority.MEDIUM,
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
                    category: Insight_1.InsightCategory.MENU_OPTIMIZATION,
                    priority: Insight_1.InsightPriority.MEDIUM,
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
        contextualFactors.upcomingEvents?.forEach((eventData) => {
            recommendations.push({
                id: `rec_event_${eventData.event.id}`,
                title: `Event Strategy: ${eventData.event.name}`,
                description: eventData.recommendation,
                category: Insight_1.InsightCategory.REVENUE_OPTIMIZATION,
                priority: eventData.event.impactLevel === 'critical' ? Insight_1.InsightPriority.CRITICAL : Insight_1.InsightPriority.HIGH,
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
    analyzeWeatherImpact(current, forecast) {
        if (!current)
            return 'Unable to assess weather impact';
        if (current.weatherCategory === 'severe') {
            return 'Severe weather may significantly reduce foot traffic. Plan for lower dine-in, higher delivery demand.';
        }
        else if (current.weatherCategory === 'excellent') {
            return 'Excellent weather conditions favor outdoor dining and increased foot traffic.';
        }
        else if (current.isRaining) {
            return 'Rain expected. Delivery and takeout likely to increase while dine-in may decrease.';
        }
        return 'Normal weather conditions expected.';
    }
    analyzeEventImpact(event) {
        if (event.distance < 0.5) {
            return `Very close proximity (${event.distance.toFixed(1)} mi) - expect major traffic impact`;
        }
        else if (event.distance < 2) {
            return `Close proximity (${event.distance.toFixed(1)} mi) - significant traffic expected`;
        }
        return `Moderate distance (${event.distance.toFixed(1)} mi) - some impact on traffic`;
    }
    getEventRecommendation(event) {
        const strategies = [];
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
    analyzeHolidayImpact(holiday) {
        return `${holiday.name} typically shows ${holiday.diningImpact} impact on restaurant traffic. ${holiday.typicalBehavior}`;
    }
    getHolidayRecommendation(holiday) {
        if (holiday.diningImpact === 'very_positive') {
            return 'Accept reservations, increase staff, extend hours, create special menu';
        }
        else if (holiday.diningImpact === 'positive') {
            return 'Moderate staffing increase, promote family dining specials';
        }
        else if (holiday.diningImpact === 'negative') {
            return 'Consider reduced hours or closure, focus on takeout/catering';
        }
        return 'Maintain normal operations';
    }
}
exports.EnhancedInsightsService = EnhancedInsightsService;
// Export singleton
exports.enhancedInsightsService = new EnhancedInsightsService();
