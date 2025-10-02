import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AnalyticsDashboard from '../../components/dashboard/AnalyticsDashboard';

/**
 * Dashboard Page
 * Main analytics dashboard for restaurant insights
 */
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <AnalyticsDashboard />
    </DashboardLayout>
  );
}