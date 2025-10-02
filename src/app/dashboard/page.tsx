'use client';

import React, { useEffect, Suspense } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AnalyticsDashboard from '../../components/dashboard/AnalyticsDashboard';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Store restaurant ID from URL params if present
    const restaurantId = searchParams.get('restaurant_id');
    if (restaurantId && typeof window !== 'undefined') {
      localStorage.setItem('restaurantId', restaurantId);
      console.log('Stored restaurantId in localStorage:', restaurantId);
    }

    // Show success message if just connected POS
    const posConnected = searchParams.get('pos_connected');
    if (posConnected === 'true') {
      console.log('✅ POS Connected! Data should be syncing now.');
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <AnalyticsDashboard />
    </DashboardLayout>
  );
}

/**
 * Dashboard Page
 * Main analytics dashboard for restaurant insights
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}