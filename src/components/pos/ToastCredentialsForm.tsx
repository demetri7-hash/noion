'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface ToastCredentialsFormProps {
  onConnect: (credentials: {
    clientId: string;
    clientSecret: string;
    restaurantGuid: string;
  }) => Promise<void>;
  onCancel: () => void;
}

/**
 * Form for manually entering Toast POS credentials
 * Used for testing until Partner Program approval
 */
export default function ToastCredentialsForm({ onConnect, onCancel }: ToastCredentialsFormProps) {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    restaurantGuid: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    try {
      await onConnect(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleChange = (field: keyof typeof credentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Toast Account</h2>
          <p className="text-gray-600 text-sm">
            Enter your Toast API credentials to sync your restaurant data
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Where to find your credentials:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log into Toast Web</li>
                <li>Go to Admin → Integrations → API Access</li>
                <li>Copy your Client ID, Client Secret, and Restaurant GUID</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Connection failed</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client ID */}
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
              Client ID
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="ml-2 text-blue-600 hover:text-blue-700"
              >
                <HelpCircle className="h-4 w-4 inline" />
              </button>
            </label>
            <input
              type="text"
              id="clientId"
              value={credentials.clientId}
              onChange={(e) => handleChange('clientId', e.target.value)}
              placeholder="e.g., 3g0R0NFYjHIQcVe9bYP8eTbJjwRTvCNV"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Client Secret */}
          <div>
            <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
              Client Secret
            </label>
            <input
              type="password"
              id="clientSecret"
              value={credentials.clientSecret}
              onChange={(e) => handleChange('clientSecret', e.target.value)}
              placeholder="Enter your Toast client secret"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Restaurant GUID */}
          <div>
            <label htmlFor="restaurantGuid" className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant GUID
            </label>
            <input
              type="text"
              id="restaurantGuid"
              value={credentials.restaurantGuid}
              onChange={(e) => handleChange('restaurantGuid', e.target.value)}
              placeholder="e.g., d3efae34-7c2e-4107-a442-49081e624706"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Help Text */}
          {showHelp && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">About Toast API Credentials</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Client ID:</strong> A unique identifier for your Toast API integration.
                  It looks like a long alphanumeric string (e.g., 3g0R0NFYjHIQcVe9bYP8eTbJjwRTvCNV).
                </p>
                <p>
                  <strong>Client Secret:</strong> A private key used to authenticate API requests.
                  Keep this secure and never share it publicly.
                </p>
                <p>
                  <strong>Restaurant GUID:</strong> Your unique restaurant identifier in Toast.
                  It&apos;s a UUID format (e.g., d3efae34-7c2e-4107-a442-49081e624706).
                </p>
              </div>
              <a
                href="https://doc.toasttab.com/doc/devguide/gettingStarted.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-3 inline-flex items-center"
              >
                View Toast Documentation
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={isConnecting}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isConnecting || !credentials.clientId || !credentials.clientSecret || !credentials.restaurantGuid}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connect Toast Account
                </>
              )}
            </button>
          </div>
        </form>

        {/* Future Note */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 <strong>Coming soon:</strong> 1-click authorization through Toast Partner Integrations.
            Manual credential entry is temporary for testing.
          </p>
        </div>
      </div>
    </div>
  );
}
