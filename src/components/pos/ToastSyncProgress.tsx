'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  currentChunk: number;
  totalChunks: number;
  percentComplete: number;
  transactionsImported: number;
  estimatedTimeRemaining: number;
  message: string;
  startedAt: Date | null;
  lastUpdatedAt: Date | null;
  completedAt?: Date | null;
  error?: string | null;
}

interface Props {
  restaurantId: string;
  onTriggerSync?: () => void;
}

/**
 * Toast Sync Progress Component
 *
 * Displays real-time sync progress in the sidebar.
 * - Shows progress bar while syncing
 * - Polls server every 5 seconds when status is 'syncing'
 * - Hides sync button while in progress
 * - Shows completion or error states
 */
export default function ToastSyncProgress({ restaurantId, onTriggerSync }: Props) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    currentChunk: 0,
    totalChunks: 0,
    percentComplete: 0,
    transactionsImported: 0,
    estimatedTimeRemaining: 0,
    message: 'No sync in progress',
    startedAt: null,
    lastUpdatedAt: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/sync-status`);
      if (response.ok) {
        const data = await response.json();
        setSyncProgress(data.syncProgress);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  // Poll for updates when syncing
  useEffect(() => {
    // Initial fetch
    fetchSyncStatus();

    // Set up polling interval if syncing (check every 10 seconds instead of 5)
    const interval = setInterval(() => {
      fetchSyncStatus();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [restaurantId]); // Only re-run if restaurantId changes

  // Format time remaining
  const formatTimeRemaining = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Render based on status
  const renderContent = () => {
    switch (syncProgress.status) {
      case 'idle':
        return (
          <button
            onClick={onTriggerSync}
            disabled={!onTriggerSync}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Toast Data
          </button>
        );

      case 'syncing':
        return (
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-xs font-semibold text-gray-700">
                    Syncing...
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-600">
                  {syncProgress.percentComplete.toFixed(1)}%
                </span>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${syncProgress.percentComplete}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                />
              </div>
            </div>

            {/* Status details */}
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Chunk:</span>
                <span className="font-medium">{syncProgress.currentChunk}/{syncProgress.totalChunks}</span>
              </div>
              <div className="flex justify-between">
                <span>Imported:</span>
                <span className="font-medium">{syncProgress.transactionsImported.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time left:</span>
                <span className="font-medium">{formatTimeRemaining(syncProgress.estimatedTimeRemaining)}</span>
              </div>
            </div>

            {/* Current message */}
            <div className="text-xs text-gray-500 truncate" title={syncProgress.message}>
              {syncProgress.message}
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md">
              <CheckCircle className="mr-2 h-4 w-4" />
              Sync Complete!
            </div>
            <div className="text-xs text-gray-600 text-center">
              {syncProgress.transactionsImported.toLocaleString()} transactions imported
            </div>
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Sync Again
              </button>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md">
              <AlertCircle className="mr-2 h-4 w-4" />
              Sync Error
            </div>
            <div className="text-xs text-red-600 text-center">
              {syncProgress.error || 'An error occurred during sync'}
            </div>
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Retry Sync
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-4 py-4 border-t border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Toast POS Sync
      </div>
      {renderContent()}
    </div>
  );
}
