import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import POSConnectionFlow from '../../components/pos/POSConnectionFlow';

/**
 * POS Integration Page
 * Handles POS system connection and management
 */
export default function POSPage() {
  return (
    <DashboardLayout>
      <POSConnectionFlow />
    </DashboardLayout>
  );
}