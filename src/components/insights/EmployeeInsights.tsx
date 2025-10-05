'use client';

/**
 * Employee Insights Component
 *
 * Simplified, gamified view of insights focused on:
 * - Fun upsell recommendations
 * - Personal performance tips
 * - Earning opportunities
 * - Quick wins
 *
 * Hides complex business analytics - shows only actionable employee-level items
 */

import React, { useEffect, useState } from 'react';

interface EmployeeRecommendation {
  id: string;
  title: string;
  description: string;
  earnPotential: number; // Earning opportunity
  difficulty: string;
  quickTip: string;
  category: string;
}

interface EmployeeInsightsProps {
  restaurantId: string;
  employeeId?: string;
}

export default function EmployeeInsights({ restaurantId, employeeId }: EmployeeInsightsProps) {
  const [recommendations, setRecommendations] = useState<EmployeeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeeRecommendations();
  }, [restaurantId, employeeId]);

  const fetchEmployeeRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        setLoading(false);
        return;
      }

      // Fetch insights and filter for employee-relevant recommendations
      const response = await fetch('/api/insights', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      const insights = data.data.insights;

      // Transform insights into employee-friendly recommendations
      const employeeRecs: EmployeeRecommendation[] = [];

      insights.forEach((insight: any) => {
        insight.recommendations?.forEach((rec: any) => {
          // Filter for employee-relevant categories
          const employeeCategories = [
            'upselling_opportunities',
            'menu_optimization',
            'customer_experience'
          ];

          if (employeeCategories.includes(rec.category)) {
            employeeRecs.push({
              id: rec.id,
              title: simplifyTitle(rec.title),
              description: simplifyDescription(rec.description),
              earnPotential: Math.round(rec.implementation.roi.expectedReturn / 10), // Estimate per employee
              difficulty: rec.implementation.difficulty,
              quickTip: generateQuickTip(rec),
              category: rec.category
            });
          }
        });
      });

      // Sort by earn potential (highest first)
      employeeRecs.sort((a, b) => b.earnPotential - a.earnPotential);

      setRecommendations(employeeRecs.slice(0, 10)); // Top 10
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const simplifyTitle = (title: string): string => {
    // Make titles more employee-friendly
    return title
      .replace(/Train staff to suggest/i, 'Try suggesting')
      .replace(/Implement/i, 'Start')
      .replace(/optimization/i, 'improvement');
  };

  const simplifyDescription = (description: string): string => {
    // Simplify business jargon
    return description
      .replace(/revenue/gi, 'sales')
      .replace(/ROI/gi, 'earnings')
      .replace(/implementation/gi, 'doing this');
  };

  const generateQuickTip = (rec: any): string => {
    // Generate actionable tips based on category
    if (rec.category === 'upselling_opportunities') {
      return "💡 Try mentioning this to every customer today!";
    }
    if (rec.category === 'menu_optimization') {
      return "🍽️ Suggest this pairing with matching orders!";
    }
    if (rec.category === 'customer_experience') {
      return "😊 A small change that makes customers happier!";
    }
    return "⭐ Easy way to boost your performance!";
  };

  const getCategoryEmoji = (category: string): string => {
    switch (category) {
      case 'upselling_opportunities': return '💰';
      case 'menu_optimization': return '🍽️';
      case 'customer_experience': return '😊';
      default: return '⭐';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Error loading recommendations</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Recommendations Yet</h3>
        <p className="text-gray-600">
          Check back soon! AI insights will appear here after analyzing your restaurant's data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">🎯 Your Earning Opportunities</h2>
        <p className="text-white/90">
          AI-powered tips to boost your sales and earn more!
        </p>
      </div>

      {/* Total Earning Potential */}
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-green-700 font-medium">Total Earning Potential</div>
            <div className="text-4xl font-bold text-green-600">
              ${recommendations.reduce((sum, r) => sum + r.earnPotential, 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-1">per month if you nail all these!</div>
          </div>
          <div className="text-6xl">💸</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.id}
            className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-purple-400 transition-all p-6"
          >
            <div className="flex items-start gap-4">
              {/* Rank Badge */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                idx === 0 ? 'bg-yellow-500' :
                idx === 1 ? 'bg-gray-400' :
                idx === 2 ? 'bg-orange-600' :
                'bg-purple-500'
              }`}>
                {idx + 1}
              </div>

              <div className="flex-1">
                {/* Title and Category */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCategoryEmoji(rec.category)}</span>
                  <h3 className="text-xl font-bold text-gray-900">{rec.title}</h3>
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-3">{rec.description}</p>

                {/* Quick Tip */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-blue-800 font-medium">{rec.quickTip}</div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-3">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                    💰 Earn up to ${rec.earnPotential}/month
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${getDifficultyColor(rec.difficulty)}`}>
                    {rec.difficulty === 'easy' && '⚡ Easy'}
                    {rec.difficulty === 'medium' && '🔥 Medium'}
                    {rec.difficulty === 'hard' && '💪 Challenge'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Encouragement Footer */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">🌟</div>
        <h3 className="text-xl font-bold mb-2">You've Got This!</h3>
        <p className="text-purple-100">
          These tips are powered by AI analysis of real customer data. Start with the easy wins and watch your earnings grow!
        </p>
      </div>
    </div>
  );
}
