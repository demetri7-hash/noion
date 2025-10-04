'use client';

import React, { useEffect, useState, Suspense } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import AnalyticsDashboard from '../../components/dashboard/AnalyticsDashboard';
import OwnerWarRoom from '../../components/dashboard/OwnerWarRoom';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<string | null>(null);

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

    // Get user role from token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role);
        } catch (e) {
          console.error('Failed to parse token:', e);
        }
      }
    }
  }, [searchParams]);

  // Role-based dashboard routing
  const isOwner = userRole === 'owner' || userRole === 'restaurant_owner';

  return (
    <MainLayout>
      {isOwner ? <OwnerWarRoom /> : <AnalyticsDashboard />}
    </MainLayout>
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