'use client';

import Link from 'next/link';
import { BarChart3, MessageSquare, ListTodo, Users, Trophy, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NOION Analytics</h1>
              <p className="text-sm text-gray-500">Restaurant Intelligence Platform</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NOION Analytics
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-Powered Restaurant Intelligence & Employee Management Platform
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard" className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">
              Real-time insights and AI-powered recommendations for your restaurant.
            </p>
          </Link>

          <Link href="/chat" className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <MessageSquare className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Chat</h3>
            <p className="text-gray-600">
              Real-time messaging with your team, direct messages, and announcements.
            </p>
          </Link>

          <Link href="/tasks" className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <ListTodo className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Task Management</h3>
            <p className="text-gray-600">
              Workflows, recurring tasks, photo verification, and digital signatures.
            </p>
          </Link>

          <Link href="/team" className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <Users className="h-12 w-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h3>
            <p className="text-gray-600">
              Role-based access control, user management, and permissions.
            </p>
          </Link>

          <Link href="/leaderboard" className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <Trophy className="h-12 w-12 text-yellow-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Leaderboard</h3>
            <p className="text-gray-600">
              Gamification with points, badges, streaks, and competitive rankings.
            </p>
          </Link>

          <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <Zap className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Insights</h3>
            <p className="text-gray-600">
              Intelligent recommendations powered by machine learning and data analysis.
            </p>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Pricing Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-lg bg-white">
              <h3 className="text-2xl font-bold mb-2">Pulse Tier</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">$29-99</p>
              <p className="text-gray-600 mb-4">per month</p>
              <p className="text-gray-700">Basic insights and lead generation</p>
            </div>

            <div className="p-6 border-2 border-blue-600 rounded-lg bg-blue-50 relative">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-sm rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Intelligence Tier</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">$299-799</p>
              <p className="text-gray-600 mb-4">per month</p>
              <p className="text-gray-700">Comprehensive analytics and employee management</p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-white">
              <h3 className="text-2xl font-bold mb-2">Command Tier</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">$2.5K-10K</p>
              <p className="text-gray-600 mb-4">per month</p>
              <p className="text-gray-700">Enterprise multi-location solutions</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2025 NOION Analytics. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
