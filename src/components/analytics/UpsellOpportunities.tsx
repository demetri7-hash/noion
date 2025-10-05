'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface UpsellOpportunity {
  id: string;
  category: string;
  itemName: string;
  description: string;
  currentPenetration: number;
  ordersWithItem: number;
  ordersWithoutItem: number;
  averagePrice: number;
  targetPenetration: number;
  potentialUpsells: number;
  potentialRevenue: number;
  topItems: { name: string; price: number; frequency: number }[];
  actionableInsight: string;
  priority: 'high' | 'medium' | 'low';
}

interface UpsellAnalyticsResult {
  totalOpportunity: number;
  opportunityCount: number;
  opportunities: UpsellOpportunity[];
  transactionCount: number;
  analysisDate: Date;
}

export default function UpsellOpportunities({ token }: { token: string }) {
  const [data, setData] = useState<UpsellAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadUpsellData();
  }, []);

  const loadUpsellData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/analytics/upsell?days=90', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load upsell data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Error loading upsell opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {error || 'Unable to calculate upsell opportunities'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Need at least 50 transactions for analysis
          </p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Revenue Opportunities
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Based on {data.transactionCount.toLocaleString()} orders from the last 90 days
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Potential</p>
            <p className="text-2xl font-bold text-green-600">
              ${data.totalOpportunity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="divide-y divide-gray-200">
        {data.opportunities.length === 0 ? (
          <div className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No upsell opportunities found</p>
            <p className="text-sm text-gray-500 mt-1">
              Your team is doing great with current offerings!
            </p>
          </div>
        ) : (
          data.opportunities.map((opp) => (
            <div key={opp.id} className="p-6 hover:bg-gray-50 transition-colors">
              {/* Opportunity Summary */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{opp.itemName}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(opp.priority)}`}>
                      {opp.priority}
                    </span>
                  </div>
                  <p className="text-gray-600 flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>{opp.actionableInsight}</span>
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-gray-600">Potential Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${opp.potentialRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">Current Rate</p>
                  <p className="text-lg font-bold text-blue-900">{opp.currentPenetration.toFixed(0)}%</p>
                  <p className="text-xs text-blue-600">{opp.ordersWithItem.toLocaleString()} orders</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">Target Rate</p>
                  <p className="text-lg font-bold text-green-900">{opp.targetPenetration.toFixed(0)}%</p>
                  <p className="text-xs text-green-600">+{(opp.targetPenetration - opp.currentPenetration).toFixed(0)}% increase</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium">Avg Price</p>
                  <p className="text-lg font-bold text-purple-900">${opp.averagePrice.toFixed(2)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-600 font-medium">Opportunity</p>
                  <p className="text-lg font-bold text-orange-900">{opp.potentialUpsells.toLocaleString()}</p>
                  <p className="text-xs text-orange-600">additional orders</p>
                </div>
              </div>

              {/* Expand/Collapse Details */}
              {opp.topItems.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {expandedId === opp.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide popular items
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show popular items ({opp.topItems.length})
                      </>
                    )}
                  </button>

                  {expandedId === opp.id && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Top Items to Recommend:</p>
                      <div className="space-y-2">
                        {opp.topItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-900">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-600">${item.price.toFixed(2)}</span>
                              <span className="text-gray-500">({item.frequency} orders)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
