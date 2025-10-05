'use client';

import { useState, useEffect } from 'react';
import { Trophy, Calendar, Copy, CheckCircle, TrendingUp, Target, DollarSign } from 'lucide-react';

interface DailyChallenge {
  day: string;
  date: string;
  itemName: string;
  category: string;
  currentPrice: number;
  currentPenetration: number;
  avgDailyOrders: number;
  currentDailyWithItem: number;
  impact: {
    successRate: number;
    additionalOrders: number;
    dailyRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  }[];
  challengeText: string;
  motivationText: string;
}

interface WeeklyChallengeData {
  weekStartDate: string;
  weekEndDate: string;
  avgDailyOrders: number;
  dailyChallenges: DailyChallenge[];
  weeklyPotential: {
    at25Percent: number;
    at50Percent: number;
    at75Percent: number;
    at100Percent: number;
  };
  generatedAt: string;
}

export default function WeeklyChallenge({ token }: { token: string }) {
  const [challenge, setChallenge] = useState<WeeklyChallengeData | null>(null);
  const [textFormat, setTextFormat] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, []);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/analytics/weekly-challenge', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const result = await response.json();
      setChallenge(result.data);
      setTextFormat(result.textFormat);
    } catch (err) {
      console.error('Error loading weekly challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(textFormat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
          </div>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error || 'Unable to generate weekly challenge'}</p>
          <p className="text-sm text-gray-500 mt-2">Need at least 100 transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg border-2 border-purple-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Weekly Upsell Challenge</h2>
              <p className="text-purple-100 text-sm flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {new Date(challenge.weekStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -
                {new Date(challenge.weekEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copy for Team
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Banner */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Daily Orders</p>
              <p className="text-2xl font-bold text-gray-900">{challenge.avgDailyOrders}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">25% Success</p>
              <p className="text-2xl font-bold text-green-600">+${challenge.weeklyPotential.at25Percent.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">50% Success</p>
              <p className="text-2xl font-bold text-green-600">+${challenge.weeklyPotential.at50Percent.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">100% Success</p>
              <p className="text-2xl font-bold text-green-600">+${challenge.weeklyPotential.at100Percent.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Daily Challenges */}
        <div className="space-y-4">
          {challenge.dailyChallenges.map((day, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{day.day}</h3>
                    <p className="text-sm text-gray-600">{day.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Target Item</p>
                    <p className="text-lg font-bold text-purple-600">{day.itemName}</p>
                    <p className="text-sm text-gray-600">${day.currentPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Challenge Details */}
              <div className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Target className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{day.challengeText}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-900 font-medium">{day.motivationText}</p>
                </div>

                {/* Current Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Current Rate</p>
                    <p className="text-lg font-bold text-blue-900">{day.currentPenetration.toFixed(0)}%</p>
                    <p className="text-xs text-blue-600">{day.currentDailyWithItem} orders/day</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Daily Orders</p>
                    <p className="text-lg font-bold text-green-900">{day.avgDailyOrders}</p>
                    <p className="text-xs text-green-600">average per day</p>
                  </div>
                </div>

                {/* Impact Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Revenue Impact
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {day.impact.map((impact, impactIdx) => (
                      <div
                        key={impactIdx}
                        className={`px-3 py-2 flex items-center justify-between ${
                          impact.successRate === 50 ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {impact.successRate}% Success
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">
                            +${impact.dailyRevenue.toFixed(0)}/day
                          </p>
                          <p className="text-xs text-gray-500">
                            ({impact.additionalOrders} more orders)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prize Section */}
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-yellow-600" />
            <div>
              <p className="font-bold text-gray-900 text-lg">🎁 Prize: [To Be Announced]</p>
              <p className="text-sm text-gray-700 mt-1">
                Whoever adds the most of each day's target item wins!
              </p>
            </div>
          </div>
        </div>

        {/* Copy Text Area */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Copy & Send to Team:
          </label>
          <textarea
            readOnly
            value={textFormat}
            className="w-full h-64 p-4 font-mono text-xs bg-gray-50 border border-gray-300 rounded-lg resize-none"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      </div>
    </div>
  );
}
