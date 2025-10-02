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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryReport = exports.discoveryReportService = exports.DiscoveryReportService = void 0;
const models_1 = require("../models");
const Insight_1 = require("../models/Insight");
const InsightGenerator_1 = require("./InsightGenerator");
// Discovery report configuration
const DISCOVERY_REPORT_CONFIG = {
    analysisperiodDays: 30,
    targetLostRevenue: 4200, // The famous $4,200 figure
    minimumTransactions: 50, // Minimum transactions needed for reliable analysis
    conversionGoal: 65, // Target 65% conversion rate
    followUpDays: [3, 7, 14, 30], // Follow-up email schedule
    trialExtensionDays: 14 // Extended trial period for discovery report recipients
};
/**
 * Free Discovery Report System
 * The conversion-driving engine that shows restaurants their $4,200 lost revenue opportunity
 */
class DiscoveryReportService {
    /**
     * Generate and send free discovery report to restaurant
     */
    async generateDiscoveryReport(restaurantId) {
        try {
            console.log(`Generating discovery report for restaurant ${restaurantId}`);
            // Validate restaurant eligibility
            const restaurant = await this.validateRestaurantEligibility(restaurantId);
            // Generate comprehensive analysis
            const insight = await this.generateDiscoveryAnalysis(restaurant);
            // Process data for report
            const reportData = await this.processDiscoveryData(restaurant, insight);
            // Send discovery report email
            await this.sendDiscoveryReportEmail(reportData);
            // Update restaurant status
            await this.updateRestaurantDiscoveryStatus(restaurant, insight);
            console.log(`Discovery report generated and sent for ${restaurant.name}`);
            return reportData;
        }
        catch (error) {
            console.error('Failed to generate discovery report:', error);
            throw error;
        }
    }
    /**
     * Validate restaurant eligibility for discovery report
     */
    async validateRestaurantEligibility(restaurantId) {
        const restaurant = await models_1.Restaurant.findById(restaurantId);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }
        // Check if discovery report already sent
        if (restaurant.features.discoveryReportSent) {
            throw new Error('Discovery report already sent to this restaurant');
        }
        // Check if POS is connected
        if (!restaurant.posConfig.isConnected) {
            throw new Error('Restaurant must connect POS system before generating discovery report');
        }
        // Check data sufficiency (minimum 30 days of data)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DISCOVERY_REPORT_CONFIG.analysisperiodDays);
        const Transaction = (await Promise.resolve().then(() => __importStar(require('../models/Transaction')))).default;
        const transactionCount = await Transaction.countDocuments({
            restaurantId: restaurantId,
            transactionDate: { $gte: thirtyDaysAgo }
        });
        if (transactionCount < DISCOVERY_REPORT_CONFIG.minimumTransactions) {
            throw new Error(`Insufficient transaction data. Need at least ${DISCOVERY_REPORT_CONFIG.minimumTransactions} transactions, found ${transactionCount}`);
        }
        return restaurant;
    }
    /**
     * Generate discovery analysis using our AI engine
     */
    async generateDiscoveryAnalysis(restaurant) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - DISCOVERY_REPORT_CONFIG.analysisperiodDays);
        // Generate free discovery insight
        const insight = await InsightGenerator_1.insightGenerator.generateInsights(restaurant._id.toString(), startDate, endDate, Insight_1.InsightType.FREE_DISCOVERY);
        // Ensure minimum lost revenue for compelling report
        if (insight.lostRevenue.total < 1000) {
            // Enhance the analysis to find more opportunities
            insight.lostRevenue = await this.enhanceRevenueAnalysis(restaurant, insight);
        }
        return insight;
    }
    /**
     * Enhance revenue analysis to ensure compelling discovery report
     */
    async enhanceRevenueAnalysis(restaurant, insight) {
        const enhancedLostRevenue = { ...insight.lostRevenue };
        // Add potential opportunities based on industry benchmarks
        const industryOpportunities = [
            {
                category: 'Upselling Program',
                amount: 1200,
                description: 'Implementing systematic upselling could increase average ticket by 15%'
            },
            {
                category: 'Peak Hour Optimization',
                amount: 800,
                description: 'Better staffing during peak hours could serve 20% more customers'
            },
            {
                category: 'Menu Engineering',
                amount: 600,
                description: 'Optimizing menu layout and pricing could boost high-margin items'
            },
            {
                category: 'Customer Retention',
                amount: 900,
                description: 'Loyalty program could increase repeat customer frequency by 25%'
            },
            {
                category: 'Operational Efficiency',
                amount: 700,
                description: 'Streamlining processes could reduce labor costs and improve service'
            }
        ];
        // Add opportunities until we reach target amount
        let currentTotal = enhancedLostRevenue.total;
        const targetAmount = Math.max(DISCOVERY_REPORT_CONFIG.targetLostRevenue, currentTotal * 2);
        for (const opportunity of industryOpportunities) {
            if (currentTotal < targetAmount) {
                enhancedLostRevenue.breakdown.push(opportunity);
                currentTotal += opportunity.amount;
            }
        }
        enhancedLostRevenue.total = currentTotal;
        enhancedLostRevenue.methodology += '. Enhanced with industry-standard improvement opportunities.';
        return enhancedLostRevenue;
    }
    /**
     * Process data for discovery report presentation
     */
    async processDiscoveryData(restaurant, insight) {
        // Calculate lost revenue breakdown with percentages
        const lostRevenue = {
            total: insight.lostRevenue.total,
            monthly: insight.lostRevenue.total,
            annual: insight.lostRevenue.total * 12,
            breakdown: insight.lostRevenue.breakdown.map(item => ({
                category: item.category,
                amount: item.amount,
                percentage: Math.round((item.amount / insight.lostRevenue.total) * 100),
                description: item.description
            }))
        };
        // Identify quick wins (easy implementations with high impact)
        const quickWins = insight.recommendations
            .filter(rec => rec.implementation.difficulty === 'easy' && rec.implementation.roi.expectedReturn > 500)
            .slice(0, 3)
            .map(rec => ({
            action: rec.title,
            impact: rec.implementation.roi.expectedReturn,
            timeframe: rec.implementation.roi.timeframe,
            difficulty: rec.implementation.difficulty
        }));
        // Calculate industry comparison
        const industryComparison = this.calculateIndustryComparison(restaurant, insight);
        // Define next steps for conversion
        const nextSteps = [
            'Schedule a 15-minute call to review your personalized report',
            'Implement the first quick-win recommendation',
            'Set up automated performance tracking',
            'Begin your 30-day revenue recovery challenge'
        ];
        return {
            restaurant,
            insight,
            lostRevenue,
            quickWins,
            industryComparison,
            nextSteps
        };
    }
    /**
     * Calculate industry performance comparison
     */
    calculateIndustryComparison(restaurant, insight) {
        // Use benchmarks from insight to determine performance
        const benchmarks = insight.benchmarks;
        let totalPercentile = 0;
        let benchmarkCount = 0;
        benchmarks.forEach(benchmark => {
            totalPercentile += benchmark.percentileRank;
            benchmarkCount++;
        });
        const avgPercentile = benchmarkCount > 0 ? totalPercentile / benchmarkCount : 50;
        let performance;
        if (avgPercentile >= 75)
            performance = 'Above Average';
        else if (avgPercentile >= 40)
            performance = 'Average';
        else
            performance = 'Below Average';
        const improvementPotential = Math.max(0, insight.lostRevenue.total);
        return {
            performance,
            percentile: Math.round(avgPercentile),
            improvementPotential
        };
    }
    /**
     * Send discovery report email
     */
    async sendDiscoveryReportEmail(reportData) {
        try {
            // Generate PDF report
            const pdfBuffer = await this.generateDiscoveryReportPDF(reportData);
            // Send email with report
            await this.sendEmail({
                to: reportData.restaurant.owner.email,
                subject: `${reportData.restaurant.name}: Your $${reportData.lostRevenue.monthly.toFixed(0)} Revenue Recovery Report`,
                template: 'discovery-report',
                data: reportData,
                attachments: [{
                        filename: `${reportData.restaurant.name}-Revenue-Recovery-Report.pdf`,
                        content: pdfBuffer
                    }]
            });
            console.log(`Discovery report email sent to ${reportData.restaurant.owner.email}`);
        }
        catch (error) {
            console.error('Failed to send discovery report email:', error);
            throw error;
        }
    }
    /**
     * Generate PDF report
     */
    async generateDiscoveryReportPDF(reportData) {
        // For now, return a mock PDF buffer
        // In production, use a PDF generation library like puppeteer or jsPDF
        const pdfContent = `
NOION ANALYTICS - REVENUE RECOVERY REPORT
${reportData.restaurant.name}
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
You're potentially losing $${reportData.lostRevenue.monthly.toFixed(0)} per month in revenue.
This translates to $${reportData.lostRevenue.annual.toFixed(0)} annually.

TOP OPPORTUNITIES:
${reportData.lostRevenue.breakdown.slice(0, 3).map(item => `• ${item.category}: $${item.amount.toFixed(0)} (${item.percentage}%)`).join('\n')}

QUICK WINS (30-Day Implementation):
${reportData.quickWins.map(win => `• ${win.action}: $${win.impact.toFixed(0)} potential impact`).join('\n')}

INDUSTRY COMPARISON:
Performance: ${reportData.industryComparison.performance}
Percentile: ${reportData.industryComparison.percentile}%

NEXT STEPS:
${reportData.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Ready to recover this revenue? Schedule your free consultation at noionanalytics.com/consultation
    `;
        return Buffer.from(pdfContent, 'utf-8');
    }
    /**
     * Send email using configured service
     */
    async sendEmail(options) {
        // Mock email sending for development
        // In production, integrate with SendGrid or similar service
        console.log(`📧 MOCK EMAIL SENT:`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Template: ${options.template}`);
        console.log(`Attachments: ${options.attachments?.length || 0}`);
        console.log(`Data keys: ${Object.keys(options.data).join(', ')}`);
        // Simulate email delivery delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    /**
     * Update restaurant discovery status
     */
    async updateRestaurantDiscoveryStatus(restaurant, insight) {
        // Mark discovery report as sent
        restaurant.features.discoveryReportSent = true;
        // Extend trial period for discovery report recipients
        if (restaurant.status === 'trial') {
            const currentTrialEnd = restaurant.subscription.trialEndsAt || new Date();
            const extendedTrialEnd = new Date(currentTrialEnd);
            extendedTrialEnd.setDate(extendedTrialEnd.getDate() + DISCOVERY_REPORT_CONFIG.trialExtensionDays);
            restaurant.subscription.trialEndsAt = extendedTrialEnd;
        }
        await restaurant.save();
        // Mark insight as sent
        insight.status = Insight_1.InsightStatus.SENT;
        insight.sentAt = new Date();
        await insight.save();
    }
    /**
     * Schedule follow-up emails for conversion
     */
    async scheduleFollowUpSequence(restaurantId) {
        const restaurant = await models_1.Restaurant.findById(restaurantId);
        if (!restaurant)
            return;
        // Schedule follow-up emails at configured intervals
        for (const days of DISCOVERY_REPORT_CONFIG.followUpDays) {
            const followUpDate = new Date();
            followUpDate.setDate(followUpDate.getDate() + days);
            // In production, add to job queue for scheduled delivery
            console.log(`📅 Scheduled follow-up email for ${restaurant.name} in ${days} days (${followUpDate.toLocaleDateString()})`);
        }
    }
    /**
     * Track discovery report engagement
     */
    async trackReportEngagement(restaurantId, eventType) {
        try {
            // Find the discovery insight
            const insight = await models_1.Insight.findOne({
                restaurantId: restaurantId,
                type: Insight_1.InsightType.FREE_DISCOVERY
            }).sort({ createdAt: -1 });
            if (!insight)
                return;
            // Update engagement tracking
            switch (eventType) {
                case 'email_opened':
                    insight.engagement.emailOpened = true;
                    insight.engagement.emailOpenedAt = new Date();
                    break;
                case 'report_viewed':
                    insight.engagement.reportViewed = true;
                    insight.engagement.reportViewedAt = new Date();
                    insight.status = Insight_1.InsightStatus.VIEWED;
                    break;
                case 'consultation_booked':
                    insight.status = Insight_1.InsightStatus.ACTED_UPON;
                    break;
            }
            await insight.save();
            console.log(`📊 Tracked ${eventType} for restaurant ${restaurantId}`);
        }
        catch (error) {
            console.error('Failed to track engagement:', error);
        }
    }
    /**
     * Check if restaurant is eligible for discovery report
     */
    async isEligibleForDiscoveryReport(restaurantId) {
        try {
            await this.validateRestaurantEligibility(restaurantId);
            return { eligible: true };
        }
        catch (error) {
            const requiredActions = [];
            if (error.message.includes('connect POS')) {
                requiredActions.push('Connect your POS system');
            }
            if (error.message.includes('Insufficient transaction')) {
                requiredActions.push('Generate more transaction data (minimum 50 transactions)');
            }
            if (error.message.includes('already sent')) {
                requiredActions.push('Discovery report has already been generated');
            }
            return {
                eligible: false,
                reason: error.message,
                requiredActions
            };
        }
    }
    /**
     * Get discovery report analytics
     */
    async getDiscoveryReportAnalytics() {
        try {
            // Get all discovery reports
            const discoveryInsights = await models_1.Insight.find({
                type: Insight_1.InsightType.FREE_DISCOVERY
            });
            const totalReportsSent = discoveryInsights.length;
            // Calculate conversion rate (restaurants that took action)
            const conversions = discoveryInsights.filter(insight => insight.status === Insight_1.InsightStatus.ACTED_UPON).length;
            const conversionRate = totalReportsSent > 0 ? (conversions / totalReportsSent) * 100 : 0;
            // Calculate average lost revenue
            const totalLostRevenue = discoveryInsights.reduce((sum, insight) => sum + insight.lostRevenue.total, 0);
            const averageLostRevenue = totalReportsSent > 0 ? totalLostRevenue / totalReportsSent : 0;
            // Find top opportunities
            const opportunityMap = {};
            discoveryInsights.forEach(insight => {
                insight.lostRevenue.breakdown.forEach(opp => {
                    if (!opportunityMap[opp.category]) {
                        opportunityMap[opp.category] = { count: 0, totalAmount: 0 };
                    }
                    opportunityMap[opp.category].count++;
                    opportunityMap[opp.category].totalAmount += opp.amount;
                });
            });
            const topOpportunities = Object.entries(opportunityMap)
                .map(([category, data]) => ({
                category,
                frequency: data.count,
                avgAmount: data.totalAmount / data.count
            }))
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5);
            return {
                totalReportsSent,
                conversionRate,
                averageLostRevenue,
                topOpportunities
            };
        }
        catch (error) {
            console.error('Failed to get discovery report analytics:', error);
            throw error;
        }
    }
}
exports.DiscoveryReportService = DiscoveryReportService;
exports.DiscoveryReport = DiscoveryReportService;
// Export singleton instance
exports.discoveryReportService = new DiscoveryReportService();
