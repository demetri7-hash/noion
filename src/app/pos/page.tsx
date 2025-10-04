'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import ToastConnectionWizard from '../../components/pos/ToastConnectionWizard';
import { CheckCircle, AlertCircle, RefreshCw, Calendar, Users, Download } from 'lucide-react';

/**
 * POS Integration Page
 * Handles POS system connection and management
 */
export default function POSPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/pos/toast/connect', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setIsConnected(result.data.isConnected);
          setConnectionStatus(result.data);
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const importStaff = async () => {
    try {
      setImporting(true);
      setImportResult(null);

      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/pos/toast/import-staff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult(result);
      } else {
        setImportResult({
          success: false,
          error: result.error || 'Failed to import staff'
        });
      }
    } catch (error) {
      console.error('Error importing staff:', error);
      setImportResult({
        success: false,
        error: 'Failed to import staff'
      });
    } finally {
      setImporting(false);
    }
  };

  const formatLastSync = (isoDate?: string) => {
    if (!isoDate) return 'Never';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">POS Integration</h1>
            {connectionStatus && (
              <div className="mt-2 flex items-center">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-700 font-medium">Connected to Toast POS</span>
                    {connectionStatus.lastSyncAt && (
                      <span className="ml-3 text-gray-500 text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Last synced {formatLastSync(connectionStatus.lastSyncAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">Not connected</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="py-8">
          {isConnected ? (
            <div className="max-w-2xl mx-auto px-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Toast POS Connection</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location ID:</span>
                    <span className="font-mono text-sm text-gray-900">{connectionStatus.locationId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto-sync:</span>
                    <span className="text-gray-900">{connectionStatus.syncInterval === 'on_login' ? 'On every login' : 'Manual'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <p className="text-blue-700 text-sm">
                    ✨ Your Toast data syncs automatically on every login, pulling only new data since your last visit. No need to reconnect!
                  </p>
                </div>

                {/* Staff Import Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Import Staff from Toast
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Import your Toast employees to link sales stats and enable gamification
                      </p>
                    </div>
                    <button
                      onClick={importStaff}
                      disabled={importing}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Import Staff
                        </>
                      )}
                    </button>
                  </div>

                  {/* Import Result */}
                  {importResult && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      importResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {importResult.success ? (
                        <>
                          <p className="text-green-800 font-medium mb-2">
                            ✅ Successfully imported {importResult.data?.totalImported} employees!
                          </p>
                          {importResult.data?.imported && importResult.data.imported.length > 0 && (
                            <div className="text-sm text-green-700 space-y-1">
                              <p className="font-medium">Imported staff:</p>
                              <ul className="list-disc list-inside ml-2">
                                {importResult.data.imported.map((staff: any, idx: number) => (
                                  <li key={idx}>
                                    {staff.name} - {staff.role}
                                    {staff.email && ` (${staff.email})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {importResult.data?.skipped && importResult.data.skipped.length > 0 && (
                            <div className="text-sm text-yellow-700 mt-2">
                              <p className="font-medium">Skipped {importResult.data.skipped.length} employees (already imported)</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-red-800">
                          ❌ {importResult.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <ToastConnectionWizard />
          )}
        </div>
      </div>
    </MainLayout>
  );
}