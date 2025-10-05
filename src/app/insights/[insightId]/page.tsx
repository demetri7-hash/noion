'use client';

/**
 * Detailed Insight View Page
 * Full breakdown of patterns, findings, and recommendations
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  implementation: {
    difficulty: string;
    timeRequired: string;
    cost: number;
    roi: {
      timeframe: string;
      expectedReturn: number;
      probability: number;
    };
  };
  steps: Array<{
    stepNumber: number;
    description: string;
    estimatedTime: string;
  }>;
  metrics: {
    kpis: string[];
    trackingMethod: string;
    expectedImprovement: string;
  };
  status: string;
}

interface KeyFinding {
  category: string;
  title: string;
  description: string;
  impact: {
    type: string;
    value: number;
    unit: string;
    timeframe: string;
  };
  confidenceScore: number;
  priority: string;
}

interface Insight {
  _id: string;
  type: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  createdAt: string;
  analysisStartDate: string;
  analysisEndDate: string;
  lostRevenue: {
    total: number;
    breakdown: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
    methodology: string;
    confidenceLevel: number;
  };
  keyFindings: KeyFinding[];
  recommendations: Recommendation[];
  dataSource: {
    transactions: {
      totalCount: number;
      totalRevenue: number;
    };
  };
}

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [implementingRec, setImplementingRec] = useState<string | null>(null);

  useEffect(() => {
    if (params.insightId) {
      fetchInsight(params.insightId as string);
    }
  }, [params.insightId]);

  const fetchInsight = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view insights');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/insights/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insight');
      }

      const data = await response.json();
      setInsight(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const markRecommendationImplemented = async (recommendationId: string) => {
    try {
      setImplementingRec(recommendationId);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/insights/${params.insightId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'implement_recommendation',
          recommendationId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update recommendation');
      }

      const data = await response.json();
      setInsight(data.data);
    } catch (err) {
      console.error('Error marking recommendation:', err);
      alert('Failed to update recommendation status');
    } finally {
      setImplementingRec(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !insight) {
    return (
      <MainLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error loading insight</p>
          <p className="text-red-600 text-sm mt-1">{error || 'Insight not found'}</p>
          <button
            onClick={() => router.push('/insights')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Insights
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/insights')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Insights
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{insight.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border border-white/30 bg-white/20`}>
                  {insight.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-purple-100 text-lg">{insight.summary}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>📅 Analysis Period: {new Date(insight.analysisStartDate).toLocaleDateString()} - {new Date(insight.analysisEndDate).toLocaleDateString()}</div>
                <div>📊 {insight.dataSource.transactions.totalCount.toLocaleString()} transactions</div>
                <div>💰 ${insight.dataSource.transactions.totalRevenue.toLocaleString()} revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lost Revenue Opportunity */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-4">
            💸 Revenue Opportunity: ${insight.lostRevenue.total.toLocaleString()}
          </h2>
          <p className="text-red-700 mb-4">{insight.lostRevenue.methodology}</p>
          <div className="space-y-2">
            {insight.lostRevenue.breakdown.map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{item.category}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <div className="text-xl font-bold text-red-600">
                  ${item.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-red-600">
            Confidence Level: {insight.lostRevenue.confidenceLevel}%
          </div>
        </div>

        {/* Key Findings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Key Findings ({insight.keyFindings.length})</h2>
          <div className="space-y-4">
            {insight.keyFindings.map((finding, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{finding.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(finding.priority)}`}>
                    {finding.priority}
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{finding.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-gray-50 px-3 py-2 rounded">
                    <span className="font-medium">Impact:</span> {finding.impact.value}{finding.impact.unit} {finding.impact.timeframe}
                  </div>
                  <div className="bg-gray-50 px-3 py-2 rounded">
                    <span className="font-medium">Category:</span> {finding.category.replace(/_/g, ' ')}
                  </div>
                  <div className="bg-gray-50 px-3 py-2 rounded">
                    <span className="font-medium">Confidence:</span> {finding.confidenceScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            💡 Action Recommendations ({insight.recommendations.length})
          </h2>
          <div className="space-y-6">
            {insight.recommendations.map((rec) => (
              <div key={rec.id} className="border-2 border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      {rec.status === 'completed' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✅ Implemented
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{rec.description}</p>
                  </div>
                </div>

                {/* ROI Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Expected Return</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${rec.implementation.roi.expectedReturn.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Timeframe</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {rec.implementation.roi.timeframe}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Success Probability</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {rec.implementation.roi.probability}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Implementation Cost</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ${rec.implementation.cost}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Implementation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Difficulty</div>
                    <div className={`text-lg font-semibold ${getDifficultyColor(rec.implementation.difficulty)}`}>
                      {rec.implementation.difficulty.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Time Required</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {rec.implementation.timeRequired}
                    </div>
                  </div>
                </div>

                {/* Implementation Steps */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Implementation Steps</div>
                  <div className="space-y-2">
                    {rec.steps.map((step) => (
                      <div key={step.stepNumber} className="flex items-start bg-gray-50 rounded p-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-900">{step.description}</div>
                          <div className="text-sm text-gray-500">Est. time: {step.estimatedTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPIs */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Success Metrics (KPIs)</div>
                  <div className="flex flex-wrap gap-2">
                    {rec.metrics.kpis.map((kpi, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {kpi}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Expected improvement: {rec.metrics.expectedImprovement}
                  </div>
                </div>

                {/* Action Button */}
                {rec.status !== 'completed' && (
                  <button
                    onClick={() => markRecommendationImplemented(rec.id)}
                    disabled={implementingRec === rec.id}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
                  >
                    {implementingRec === rec.id ? 'Marking as Implemented...' : '✅ Mark as Implemented'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
