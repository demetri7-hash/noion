// import { Anthropic } from '@anthropic-ai/sdk';
import axios from 'axios';
import { Restaurant, Insight, Transaction, IInsight } from '../models';
import { 
  InsightType, 
  InsightCategory, 
  InsightPriority, 
  InsightStatus,
  IKeyFinding,
  IRecommendation,
  IBenchmark
} from '../models/Insight';

// Claude AI client configuration
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY || '',
// });

// Industry benchmarks (based on restaurant industry data)
const INDUSTRY_BENCHMARKS = {
  averageTicket: { 
    quickService: 12, 
    casualDining: 28, 
    fineDining: 65 
  },
  laborCostPercentage: { 
    quickService: 28, 
    casualDining: 32, 
    fineDining: 35 
  },
  foodCostPercentage: { 
    quickService: 30, 
    casualDining: 28, 
    fineDining: 25 
  },
  turnoverRate: { 
    quickService: 4.2, 
    casualDining: 3.8, 
    fineDining: 2.5 
  },
  customerReturnRate: { 
    quickService: 65, 
    casualDining: 45, 
    fineDining: 75 
  },
  averageServiceTime: { 
    quickService: 3.5, 
    casualDining: 8.5, 
    fineDining: 15 
  }
};

// Interface for analysis results
interface IAnalysisResult {
  revenueLeakage: {
    total: number;
    opportunities: Array<{
      category: string;
      amount: number;
      description: string;
      confidence: number;
    }>;
  };
  employeePerformance: {
    topPerformers: Array<{ id: string; name?: string; metrics: any }>;
    underPerformers: Array<{ id: string; name?: string; issues: string[] }>;
    averageMetrics: any;
  };
  customerExperience: {
    satisfactionScore: number;
    waitTimeIssues: boolean;
    serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
  };
  operationalEfficiency: {
    peakHourUtilization: number;
    staffOptimization: string[];
    processImprovements: string[];
  };
}

/**
 * Core AI Insight Generation Engine
 * Analyzes restaurant data and generates actionable insights using Claude AI
 */
export class InsightGeneratorService {
  private promptVersion = '1.0';

  /**
   * Generate comprehensive insights for a restaurant
   */
  async generateInsights(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
    insightType: InsightType = InsightType.WEEKLY_SUMMARY
  ): Promise<IInsight> {
    try {
      console.log(`Generating ${insightType} insights for restaurant ${restaurantId}`);

      // Fetch restaurant and validate
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Gather and analyze data
      const analysisResult = await this.analyzeRestaurantData(restaurantId, startDate, endDate);
      
      // Generate AI-powered insights
      const aiInsights = await this.generateAIInsights(restaurant, analysisResult, insightType);
      
      // Create and save insight record
      const insight = await this.createInsightRecord(
        restaurant,
        analysisResult,
        aiInsights,
        startDate,
        endDate,
        insightType
      );

      console.log(`Generated insights for restaurant ${restaurantId}: ${insight._id}`);
      return insight;

    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw error;
    }
  }

  /**
   * Analyze restaurant data for insights
   */
  private async analyzeRestaurantData(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAnalysisResult> {
    // Fetch transactions for the period
    const transactions = await Transaction.find({
      restaurantId,
      transactionDate: { $gte: startDate, $lte: endDate }
    }).sort({ transactionDate: -1 });
    
    if (transactions.length === 0) {
      throw new Error('No transaction data available for analysis');
    }

    // Analyze revenue leakage
    const revenueLeakage = this.analyzeRevenueLeakage(transactions);
    
    // Analyze employee performance
    const employeePerformance = this.analyzeEmployeePerformance(transactions);
    
    // Analyze customer experience
    const customerExperience = this.analyzeCustomerExperience(transactions);
    
    // Analyze operational efficiency
    const operationalEfficiency = this.analyzeOperationalEfficiency(transactions);

    return {
      revenueLeakage,
      employeePerformance,
      customerExperience,
      operationalEfficiency
    };
  }

  /**
   * Detect revenue leakage opportunities
   */
  private analyzeRevenueLeakage(transactions: any[]): IAnalysisResult['revenueLeakage'] {
    const opportunities: Array<{
      category: string;
      amount: number;
      description: string;
      confidence: number;
    }> = [];

    // 1. Missed upselling opportunities
    const lowTicketTransactions = transactions.filter(t => t.totalAmount < 15);
    const avgUpsellPotential = 8.5; // Average additional revenue per upsell
    const upsellMissed = lowTicketTransactions.length * avgUpsellPotential * 0.3; // 30% conversion rate

    if (upsellMissed > 0) {
      opportunities.push({
        category: 'Missed Upselling',
        amount: upsellMissed,
        description: `${lowTicketTransactions.length} low-ticket transactions could have been upsold`,
        confidence: 75
      });
    }

    // 2. High discount usage
    const discountedTransactions = transactions.filter(t => 
      t.discounts && t.discounts.length > 0
    );
    
    const totalDiscountAmount = discountedTransactions.reduce((sum, t) => 
      sum + t.discounts.reduce((dSum: number, d: any) => dSum + d.amount, 0), 0
    );
    
    const excessiveDiscounts = totalDiscountAmount * 0.4; // 40% of discounts could be reduced

    if (excessiveDiscounts > 100) {
      opportunities.push({
        category: 'Excessive Discounting',
        amount: excessiveDiscounts,
        description: `$${totalDiscountAmount.toFixed(2)} in discounts applied, ${Math.round(excessiveDiscounts)} could be reduced`,
        confidence: 65
      });
    }

    // 3. Peak hour understaffing
    const peakHourTransactions = transactions.filter(t => t.analytics.isDuringPeakHours);
    const avgWaitTime = peakHourTransactions.reduce((sum, t) => 
      sum + (t.timing.waitTime || 0), 0
    ) / peakHourTransactions.length;

    if (avgWaitTime > 12) { // More than 12 minutes average wait
      const lostRevenue = peakHourTransactions.length * 3.2; // Estimated lost revenue per long wait
      opportunities.push({
        category: 'Long Wait Times',
        amount: lostRevenue,
        description: `Average wait time of ${avgWaitTime.toFixed(1)} minutes causing customer loss`,
        confidence: 80
      });
    }

    // 4. Menu optimization opportunities
    const menuAnalysis = this.analyzeMenuPerformance(transactions);
    if (menuAnalysis.underperformingItems > 0) {
      opportunities.push({
        category: 'Menu Optimization',
        amount: menuAnalysis.potentialRevenue,
        description: `${menuAnalysis.underperformingItems} underperforming menu items`,
        confidence: 70
      });
    }

    const totalLeakage = opportunities.reduce((sum, opp) => sum + opp.amount, 0);

    return {
      total: totalLeakage,
      opportunities
    };
  }

  /**
   * Analyze employee performance
   */
  private analyzeEmployeePerformance(transactions: any[]): IAnalysisResult['employeePerformance'] {
    // Group transactions by employee
    const employeeGroups = transactions.reduce((groups: any, transaction) => {
      const empId = transaction.employee.id;
      if (!groups[empId]) {
        groups[empId] = [];
      }
      groups[empId].push(transaction);
      return groups;
    }, {});

    const employeeMetrics = Object.entries(employeeGroups).map(([empId, empTransactions]: [string, any]) => {
      const totalSales = empTransactions.reduce((sum: number, t: any) => sum + t.totalAmount, 0);
      const avgTicket = totalSales / empTransactions.length;
      const avgServiceTime = empTransactions.reduce((sum: number, t: any) => 
        sum + (t.employee.serviceTime || 0), 0
      ) / empTransactions.length;

      return {
        id: empId,
        name: empTransactions[0].employee.name,
        transactionCount: empTransactions.length,
        totalSales,
        avgTicket,
        avgServiceTime,
        voidRate: empTransactions.filter((t: any) => t.status === 'voided').length / empTransactions.length
      };
    });

    // Sort by performance score (combination of sales and efficiency)
    const sortedEmployees = employeeMetrics.sort((a, b) => {
      const scoreA = a.avgTicket * 0.4 + (1 / (a.avgServiceTime || 1)) * 0.3 + (1 - a.voidRate) * 0.3;
      const scoreB = b.avgTicket * 0.4 + (1 / (b.avgServiceTime || 1)) * 0.3 + (1 - b.voidRate) * 0.3;
      return scoreB - scoreA;
    });

    const topPerformers = sortedEmployees.slice(0, 3).map(emp => ({
      id: emp.id,
      name: emp.name,
      metrics: {
        avgTicket: emp.avgTicket,
        totalSales: emp.totalSales,
        transactionCount: emp.transactionCount
      }
    }));

    const underPerformers = sortedEmployees.slice(-2).map(emp => {
      const issues: string[] = [];
      if (emp.avgTicket < 20) issues.push('Low average ticket');
      if (emp.avgServiceTime > 10) issues.push('Slow service time');
      if (emp.voidRate > 0.05) issues.push('High void rate');
      
      return {
        id: emp.id,
        name: emp.name,
        issues
      };
    });

    const averageMetrics = {
      avgTicket: employeeMetrics.reduce((sum, emp) => sum + emp.avgTicket, 0) / employeeMetrics.length,
      avgServiceTime: employeeMetrics.reduce((sum, emp) => sum + emp.avgServiceTime, 0) / employeeMetrics.length,
      voidRate: employeeMetrics.reduce((sum, emp) => sum + emp.voidRate, 0) / employeeMetrics.length
    };

    return {
      topPerformers,
      underPerformers,
      averageMetrics
    };
  }

  /**
   * Analyze customer experience metrics
   */
  private analyzeCustomerExperience(transactions: any[]): IAnalysisResult['customerExperience'] {
    const avgWaitTime = transactions.reduce((sum, t) => 
      sum + (t.timing.waitTime || 0), 0
    ) / transactions.length;

    const voidRate = transactions.filter(t => t.status === 'voided').length / transactions.length;
    const repeatCustomerRate = transactions.filter(t => t.analytics.isRepeatCustomer).length / transactions.length;

    // Calculate satisfaction score based on multiple factors
    let satisfactionScore = 100;
    satisfactionScore -= avgWaitTime * 2; // Subtract 2 points per minute wait
    satisfactionScore -= voidRate * 100; // Subtract 100 points per 1% void rate
    satisfactionScore += repeatCustomerRate * 50; // Add 50 points per 1% repeat rate
    satisfactionScore = Math.max(0, Math.min(100, satisfactionScore)); // Clamp to 0-100

    const waitTimeIssues = avgWaitTime > 8; // More than 8 minutes is concerning
    
    let serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
    if (satisfactionScore >= 85) serviceQuality = 'excellent';
    else if (satisfactionScore >= 70) serviceQuality = 'good';
    else if (satisfactionScore >= 55) serviceQuality = 'average';
    else serviceQuality = 'poor';

    return {
      satisfactionScore,
      waitTimeIssues,
      serviceQuality
    };
  }

  /**
   * Analyze operational efficiency
   */
  private analyzeOperationalEfficiency(transactions: any[]): IAnalysisResult['operationalEfficiency'] {
    // Peak hour analysis
    const peakHourTransactions = transactions.filter(t => t.analytics.isDuringPeakHours);
    const peakHourUtilization = (peakHourTransactions.length / transactions.length) * 100;

    // Staff optimization suggestions
    const staffOptimization: string[] = [];
    if (peakHourUtilization < 30) {
      staffOptimization.push('Consider reducing staff during off-peak hours');
    }
    if (peakHourUtilization > 70) {
      staffOptimization.push('Consider adding staff during peak hours');
    }

    // Process improvements
    const processImprovements: string[] = [];
    const avgServiceTime = transactions.reduce((sum, t) => 
      sum + (t.employee.serviceTime || 0), 0
    ) / transactions.length;
    
    if (avgServiceTime > 8) {
      processImprovements.push('Streamline order-taking process');
    }

    const voidRate = transactions.filter(t => t.status === 'voided').length / transactions.length;
    if (voidRate > 0.03) {
      processImprovements.push('Improve order accuracy training');
    }

    return {
      peakHourUtilization,
      staffOptimization,
      processImprovements
    };
  }

  /**
   * Analyze menu performance
   */
  private analyzeMenuPerformance(transactions: any[]): { underperformingItems: number; potentialRevenue: number } {
    // Group items by frequency
    const itemFrequency: { [key: string]: number } = {};
    const itemRevenue: { [key: string]: number } = {};

    transactions.forEach(transaction => {
      transaction.items.forEach((item: any) => {
        const itemName = item.name;
        itemFrequency[itemName] = (itemFrequency[itemName] || 0) + item.quantity;
        itemRevenue[itemName] = (itemRevenue[itemName] || 0) + item.totalPrice;
      });
    });

    // Calculate average frequency and revenue
    const items = Object.keys(itemFrequency);
    const avgFrequency = Object.values(itemFrequency).reduce((sum, freq) => sum + freq, 0) / items.length;
    const avgRevenue = Object.values(itemRevenue).reduce((sum, rev) => sum + rev, 0) / items.length;

    // Find underperforming items (below 50% of average in both frequency and revenue)
    const underperformingItems = items.filter(item => 
      itemFrequency[item] < avgFrequency * 0.5 && itemRevenue[item] < avgRevenue * 0.5
    ).length;

    // Estimate potential revenue from optimizing these items
    const potentialRevenue = underperformingItems * avgRevenue * 0.3; // 30% improvement potential

    return { underperformingItems, potentialRevenue };
  }

  /**
   * Generate AI-powered insights using Claude
   */
  private async generateAIInsights(
    restaurant: any,
    analysisResult: IAnalysisResult,
    insightType: InsightType
  ): Promise<{
    summary: string;
    keyFindings: IKeyFinding[];
    recommendations: IRecommendation[];
    aiResponse: string;
    tokensUsed: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    // Create comprehensive prompt for Claude
    const prompt = this.buildClaudePrompt(restaurant, analysisResult, insightType);

    try {
      // For now, we'll use a mock response until we add the Anthropic SDK
      // const response = await anthropic.messages.create({
      //   model: 'claude-3-5-sonnet-20241022',
      //   max_tokens: 4000,
      //   temperature: 0.3,
      //   messages: [{
      //     role: 'user',
      //     content: prompt
      //   }]
      // });

      // Mock response for development - replace with actual Claude API call
      const mockResponse = this.generateMockClaudeResponse(analysisResult, restaurant);
      const processingTime = Date.now() - startTime;
      
      // Parse AI response into structured format
      const parsed = this.parseAIResponse(JSON.stringify(mockResponse), analysisResult);

      return {
        ...parsed,
        aiResponse: JSON.stringify(mockResponse),
        tokensUsed: 1500, // Mock token count
        processingTime
      };

    } catch (error) {
      console.error('Claude API error:', error);
      
      // Fallback to rule-based insights if AI fails
      return this.generateFallbackInsights(analysisResult, Date.now() - startTime);
    }
  }

  /**
   * Generate mock Claude response for development
   */
  private generateMockClaudeResponse(analysisResult: IAnalysisResult, restaurant: any): any {
    return {
      summary: `${restaurant.name} shows $${analysisResult.revenueLeakage.total.toFixed(2)} in monthly revenue recovery opportunities. Key areas include upselling optimization and operational efficiency improvements.`,
      keyFindings: [
        {
          category: 'revenue_optimization',
          title: 'Significant Revenue Leakage Identified',
          description: `Analysis revealed $${analysisResult.revenueLeakage.total.toFixed(2)} in monthly revenue recovery opportunities through improved upselling and reduced discounting.`,
          financialImpact: {
            amount: analysisResult.revenueLeakage.total,
            timeframe: 'monthly'
          },
          confidenceScore: 85,
          priority: 'high'
        },
        {
          category: 'employee_performance',
          title: 'Employee Performance Optimization',
          description: `Top performers are generating ${analysisResult.employeePerformance.averageMetrics.avgTicket > 25 ? 'above' : 'below'} average tickets. Training opportunities identified for underperforming staff.`,
          financialImpact: {
            amount: analysisResult.employeePerformance.averageMetrics.avgTicket * 10,
            timeframe: 'monthly'
          },
          confidenceScore: 75,
          priority: 'medium'
        }
      ],
      recommendations: [
        {
          title: 'Implement Upselling Training Program',
          description: 'Train staff on suggestive selling techniques to increase average ticket size',
          category: 'revenue_optimization',
          priority: 'high',
          difficulty: 'easy',
          timeRequired: '2 weeks',
          cost: 500,
          roi: {
            expectedReturn: analysisResult.revenueLeakage.total * 0.4,
            timeframe: '60 days',
            probability: 80
          },
          steps: [
            'Conduct staff training on upselling techniques',
            'Create point-of-sale prompts for servers',
            'Monitor results and adjust approach'
          ],
          successMetrics: ['Average ticket size', 'Upselling conversion rate']
        }
      ]
    };
  }

  /**
   * Build comprehensive prompt for Claude AI
   */
  private buildClaudePrompt(
    restaurant: any,
    analysisResult: IAnalysisResult,
    insightType: InsightType
  ): string {
    return `You are an expert restaurant analytics consultant analyzing data for ${restaurant.name}, a ${restaurant.type} restaurant. 

RESTAURANT CONTEXT:
- Type: ${restaurant.type}
- Location: ${restaurant.location.city}, ${restaurant.location.state}
- Subscription Tier: ${restaurant.subscription.tier}
- Current Status: ${restaurant.status}

ANALYSIS RESULTS:
Revenue Leakage: $${analysisResult.revenueLeakage.total.toFixed(2)}
- Opportunities: ${JSON.stringify(analysisResult.revenueLeakage.opportunities, null, 2)}

Employee Performance:
- Top Performers: ${JSON.stringify(analysisResult.employeePerformance.topPerformers, null, 2)}
- Underperformers: ${JSON.stringify(analysisResult.employeePerformance.underPerformers, null, 2)}
- Average Metrics: ${JSON.stringify(analysisResult.employeePerformance.averageMetrics, null, 2)}

Customer Experience:
- Satisfaction Score: ${analysisResult.customerExperience.satisfactionScore}/100
- Service Quality: ${analysisResult.customerExperience.serviceQuality}
- Wait Time Issues: ${analysisResult.customerExperience.waitTimeIssues}

Operational Efficiency:
- Peak Hour Utilization: ${analysisResult.operationalEfficiency.peakHourUtilization}%
- Optimization Suggestions: ${JSON.stringify(analysisResult.operationalEfficiency.staffOptimization)}

TASK: Generate a ${insightType} report with:

1. EXECUTIVE SUMMARY (2-3 sentences highlighting the most critical findings)

2. KEY FINDINGS (3-5 findings, each with):
   - Category (revenue_optimization, employee_performance, customer_experience, operational_efficiency, cost_reduction, peak_hour_analysis, menu_optimization, or upselling_opportunities)
   - Title (concise, action-oriented)
   - Description (detailed explanation)
   - Financial Impact (specific dollar amount and timeframe)
   - Confidence Score (0-100)
   - Priority (critical, high, medium, low)

3. ACTIONABLE RECOMMENDATIONS (3-7 recommendations, each with):
   - Title (clear action item)
   - Description (how to implement)
   - Category (same as findings)
   - Priority (critical, high, medium, low)
   - Implementation difficulty (easy, medium, hard)
   - Time required (e.g., "30 minutes", "2 hours", "1 week")
   - Cost (implementation cost in dollars)
   - ROI (expected return, timeframe, probability percentage)
   - Step-by-step implementation
   - Success metrics to track

Format your response as JSON with this structure:
{
  "summary": "Executive summary text",
  "keyFindings": [...],
  "recommendations": [...]
}

Focus on actionable, specific advice that will directly impact revenue and customer satisfaction. Use restaurant industry best practices and be precise with financial estimates.`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(
    aiResponse: string,
    analysisResult: IAnalysisResult
  ): {
    summary: string;
    keyFindings: IKeyFinding[];
    recommendations: IRecommendation[];
  } {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(aiResponse);
      
      // Convert to our interface format
      const keyFindings: IKeyFinding[] = parsed.keyFindings?.map((finding: any, index: number) => ({
        category: this.mapCategory(finding.category),
        title: finding.title,
        description: finding.description,
        impact: {
          type: 'revenue',
          value: finding.financialImpact?.amount || 0,
          unit: '$',
          timeframe: finding.financialImpact?.timeframe || 'monthly'
        },
        evidence: {
          dataPoints: [],
          trends: []
        },
        confidenceScore: finding.confidenceScore || 70,
        priority: this.mapPriority(finding.priority)
      })) || [];

      const recommendations: IRecommendation[] = parsed.recommendations?.map((rec: any, index: number) => ({
        id: `rec_${Date.now()}_${index}`,
        title: rec.title,
        description: rec.description,
        category: this.mapCategory(rec.category),
        priority: this.mapPriority(rec.priority),
        implementation: {
          difficulty: rec.difficulty || 'medium',
          timeRequired: rec.timeRequired || '1 hour',
          cost: rec.cost || 0,
          roi: {
            timeframe: rec.roi?.timeframe || '30 days',
            expectedReturn: rec.roi?.expectedReturn || 0,
            probability: rec.roi?.probability || 70
          }
        },
        steps: rec.steps?.map((step: any, stepIndex: number) => ({
          stepNumber: stepIndex + 1,
          description: step,
          estimatedTime: '30 minutes'
        })) || [],
        metrics: {
          kpis: rec.successMetrics || [],
          trackingMethod: 'POS system monitoring',
          expectedImprovement: rec.expectedImprovement || 'Monitor for 30 days'
        },
        status: 'suggested'
      })) || [];

      return {
        summary: parsed.summary || 'Analysis completed successfully.',
        keyFindings,
        recommendations
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Return structured fallback
      return this.generateFallbackInsights(analysisResult, 0);
    }
  }

  /**
   * Generate fallback insights if AI fails
   */
  private generateFallbackInsights(
    analysisResult: IAnalysisResult,
    processingTime: number
  ): {
    summary: string;
    keyFindings: IKeyFinding[];
    recommendations: IRecommendation[];
    aiResponse: string;
    tokensUsed: number;
    processingTime: number;
  } {
    const keyFindings: IKeyFinding[] = [];
    const recommendations: IRecommendation[] = [];

    // Generate revenue leakage finding
    if (analysisResult.revenueLeakage.total > 0) {
      keyFindings.push({
        category: InsightCategory.REVENUE_OPTIMIZATION,
        title: 'Revenue Leakage Identified',
        description: `Analysis identified $${analysisResult.revenueLeakage.total.toFixed(2)} in potential revenue recovery opportunities.`,
        impact: {
          type: 'revenue',
          value: analysisResult.revenueLeakage.total,
          unit: '$',
          timeframe: 'monthly'
        },
        evidence: {
          dataPoints: [],
          trends: []
        },
        confidenceScore: 75,
        priority: InsightPriority.HIGH
      });

      // Add corresponding recommendation
      recommendations.push({
        id: `rec_fallback_${Date.now()}`,
        title: 'Implement Revenue Recovery Plan',
        description: 'Focus on the identified revenue leakage opportunities to recover lost revenue.',
        category: InsightCategory.REVENUE_OPTIMIZATION,
        priority: InsightPriority.HIGH,
        implementation: {
          difficulty: 'medium',
          timeRequired: '2 weeks',
          cost: 500,
          roi: {
            timeframe: '60 days',
            expectedReturn: analysisResult.revenueLeakage.total * 0.7,
            probability: 75
          }
        },
        steps: [
          {
            stepNumber: 1,
            description: 'Review identified revenue opportunities',
            estimatedTime: '2 hours'
          },
          {
            stepNumber: 2,
            description: 'Implement staff training programs',
            estimatedTime: '1 week'
          }
        ],
        metrics: {
          kpis: ['Average ticket size', 'Revenue per customer'],
          trackingMethod: 'Daily POS reports',
          expectedImprovement: '15-25% revenue increase'
        },
        status: 'suggested'
      });
    }

    return {
      summary: `Analysis identified $${analysisResult.revenueLeakage.total.toFixed(2)} in revenue recovery opportunities with ${analysisResult.employeePerformance.topPerformers.length} top-performing employees leading the way.`,
      keyFindings,
      recommendations,
      aiResponse: 'Fallback analysis generated due to AI service unavailability.',
      tokensUsed: 0,
      processingTime
    };
  }

  /**
   * Map category strings to enum values
   */
  private mapCategory(category: string): InsightCategory {
    const categoryMap: { [key: string]: InsightCategory } = {
      'revenue_optimization': InsightCategory.REVENUE_OPTIMIZATION,
      'employee_performance': InsightCategory.EMPLOYEE_PERFORMANCE,
      'customer_experience': InsightCategory.CUSTOMER_EXPERIENCE,
      'operational_efficiency': InsightCategory.OPERATIONAL_EFFICIENCY,
      'cost_reduction': InsightCategory.COST_REDUCTION,
      'peak_hour_analysis': InsightCategory.PEAK_HOUR_ANALYSIS,
      'menu_optimization': InsightCategory.MENU_OPTIMIZATION,
      'upselling_opportunities': InsightCategory.UPSELLING_OPPORTUNITIES
    };

    return categoryMap[category.toLowerCase()] || InsightCategory.OPERATIONAL_EFFICIENCY;
  }

  /**
   * Map priority strings to enum values
   */
  private mapPriority(priority: string): InsightPriority {
    const priorityMap: { [key: string]: InsightPriority } = {
      'critical': InsightPriority.CRITICAL,
      'high': InsightPriority.HIGH,
      'medium': InsightPriority.MEDIUM,
      'low': InsightPriority.LOW
    };

    return priorityMap[priority.toLowerCase()] || InsightPriority.MEDIUM;
  }

  /**
   * Create and save insight record
   */
  private async createInsightRecord(
    restaurant: any,
    analysisResult: IAnalysisResult,
    aiInsights: any,
    startDate: Date,
    endDate: Date,
    insightType: InsightType
  ): Promise<IInsight> {
    // Calculate benchmarks
    const benchmarks = this.calculateBenchmarks(restaurant, analysisResult);

    // Create lost revenue breakdown
    const lostRevenue = {
      total: analysisResult.revenueLeakage.total,
      breakdown: analysisResult.revenueLeakage.opportunities.map(opp => ({
        category: opp.category,
        amount: opp.amount,
        description: opp.description
      })),
      methodology: 'AI-powered analysis of transaction patterns, employee performance, and operational efficiency metrics',
      confidenceLevel: 75
    };

    // Create data source summary
    const dataSource = {
      transactions: {
        startDate,
        endDate,
        totalCount: 100, // This should be actual count from the analysis
        totalRevenue: 5000 // This should be actual revenue from the analysis
      }
    };

    const insightData = {
      restaurantId: restaurant._id,
      type: insightType,
      title: this.generateInsightTitle(restaurant.name, insightType, analysisResult),
      summary: aiInsights.summary,
      analysisStartDate: startDate,
      analysisEndDate: endDate,
      dataSource,
      keyFindings: aiInsights.keyFindings,
      recommendations: aiInsights.recommendations,
      benchmarks,
      lostRevenue,
      aiAnalysis: {
        model: 'claude-3-5-sonnet-20241022',
        promptVersion: this.promptVersion,
        rawResponse: aiInsights.aiResponse,
        processingTime: aiInsights.processingTime,
        tokensUsed: aiInsights.tokensUsed
      },
      status: InsightStatus.GENERATED,
      priority: this.calculateOverallPriority(aiInsights.keyFindings),
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
    };

    const insight = new Insight(insightData);
    return await insight.save();
  }

  /**
   * Calculate industry benchmarks
   */
  private calculateBenchmarks(restaurant: any, analysisResult: IAnalysisResult): IBenchmark[] {
    const benchmarks: IBenchmark[] = [];
    
    const restaurantType = restaurant.type.toLowerCase().replace('_', '');
    const industryBenchmark = INDUSTRY_BENCHMARKS.averageTicket[restaurantType as keyof typeof INDUSTRY_BENCHMARKS.averageTicket] || 25;
    
    // Average ticket benchmark
    benchmarks.push({
      metric: 'Average Ticket Size',
      restaurantValue: analysisResult.employeePerformance.averageMetrics.avgTicket || 0,
      industryAverage: industryBenchmark,
      topPerformerValue: industryBenchmark * 1.3,
      percentileRank: this.calculatePercentileRank(
        analysisResult.employeePerformance.averageMetrics.avgTicket || 0,
        industryBenchmark
      ),
      unit: '$'
    });

    return benchmarks;
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentileRank(value: number, benchmark: number): number {
    const ratio = value / benchmark;
    if (ratio >= 1.3) return 90;
    if (ratio >= 1.1) return 75;
    if (ratio >= 0.9) return 50;
    if (ratio >= 0.7) return 25;
    return 10;
  }

  /**
   * Generate insight title
   */
  private generateInsightTitle(
    restaurantName: string,
    insightType: InsightType,
    analysisResult: IAnalysisResult
  ): string {
    const revenueAmount = analysisResult.revenueLeakage.total;
    
    switch (insightType) {
      case InsightType.FREE_DISCOVERY:
        return `${restaurantName}: $${revenueAmount.toFixed(0)} Monthly Revenue Recovery Opportunity`;
      case InsightType.WEEKLY_SUMMARY:
        return `${restaurantName}: Weekly Performance Analysis`;
      case InsightType.MONTHLY_ANALYSIS:
        return `${restaurantName}: Comprehensive Monthly Review`;
      default:
        return `${restaurantName}: Performance Insights`;
    }
  }

  /**
   * Calculate overall priority based on findings
   */
  private calculateOverallPriority(keyFindings: IKeyFinding[]): InsightPriority {
    if (keyFindings.some(f => f.priority === InsightPriority.CRITICAL)) {
      return InsightPriority.CRITICAL;
    }
    if (keyFindings.some(f => f.priority === InsightPriority.HIGH)) {
      return InsightPriority.HIGH;
    }
    return InsightPriority.MEDIUM;
  }
}

// Export singleton instance
export const insightGenerator = new InsightGeneratorService();
export { InsightGeneratorService as InsightGenerator };