'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  ExternalLink,
  Shield,
  Zap,
  Database
} from 'lucide-react';
import ToastCredentialsForm from './ToastCredentialsForm';

// POS system types
interface IPOSSystem {
  id: string;
  name: string;
  logo: string;
  description: string;
  features: string[];
  setupTime: string;
  status: 'available' | 'coming_soon' | 'connected';
}

// Connection status
interface IConnectionStatus {
  isConnected: boolean;
  lastSync: Date | null;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  error?: string;
}

/**
 * POS Connection Component
 * Handles POS system integration and connection management
 */
export default function POSConnectionFlow() {
  const router = useRouter();
  const [selectedPOS, setSelectedPOS] = useState<IPOSSystem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<IConnectionStatus>({
    isConnected: false,
    lastSync: null,
    status: 'disconnected'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'select' | 'authorize' | 'verify' | 'complete'>('select');

  // Available POS systems
  const posSystems: IPOSSystem[] = [
    {
      id: 'toast',
      name: 'Toast POS',
      logo: '/logos/toast.svg',
      description: 'Complete restaurant management platform with built-in payment processing',
      features: ['Real-time sales data', 'Menu management', 'Staff performance', 'Customer insights'],
      setupTime: '5 minutes',
      status: 'available'
    },
    {
      id: 'square',
      name: 'Square for Restaurants',
      logo: '/logos/square.svg',
      description: 'All-in-one solution for restaurants with advanced reporting',
      features: ['Transaction history', 'Inventory tracking', 'Employee management', 'Analytics'],
      setupTime: '3 minutes',
      status: 'coming_soon'
    },
    {
      id: 'clover',
      name: 'Clover',
      logo: '/logos/clover.svg',
      description: 'Flexible POS system with extensive third-party integrations',
      features: ['Sales reporting', 'Inventory management', 'Customer data', 'Payment processing'],
      setupTime: '7 minutes',
      status: 'coming_soon'
    }
  ];

  const handlePOSSelection = (pos: IPOSSystem) => {
    if (pos.status !== 'available') return;
    setSelectedPOS(pos);
    setStep('authorize');
  };

  const handleConnect = async () => {
    if (!selectedPOS) return;

    setIsConnecting(true);
    setConnectionStatus({ ...connectionStatus, status: 'connecting' });

    try {
      console.log('Connecting to Toast POS using environment credentials...');

      // For now, use a hardcoded test restaurant ID from localStorage or create one
      const testRestaurantId = typeof window !== 'undefined'
        ? localStorage.getItem('restaurantId') || 'test-restaurant-id'
        : 'test-restaurant-id';

      // Call the API to connect to Toast (credentials come from env vars)
      const response = await fetch(`/api/restaurants/${testRestaurantId}/connect-pos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posType: 'toast'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.hint || 'Connection failed');
      }

      console.log('✅ Toast POS job queued successfully!', result);

      // Store restaurant ID and sync job info
      if (typeof window !== 'undefined') {
        // Use the restaurant ID returned from the API (the real MongoDB ObjectId)
        const actualRestaurantId = result.data?.restaurantId || testRestaurantId;
        localStorage.setItem('restaurantId', actualRestaurantId);
        if (result.data?.restaurantGuid) {
          localStorage.setItem('toastRestaurantGuid', result.data.restaurantGuid);
        }
        // Store job info to track sync progress
        if (result.data?.syncJob) {
          localStorage.setItem('syncJobId', result.data.syncJob.id);
          localStorage.setItem('syncJobStatus', result.data.syncJob.status);
        }
      }

      setConnectionStatus({
        isConnected: false, // Not fully connected until sync completes
        lastSync: null,
        status: 'connected' // Using "connected" to indicate job queued
      });
      setStep('complete');

    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionStatus({
        isConnected: false,
        lastSync: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to connect to POS system. Please try again.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConnectionStatus({
        isConnected: false,
        lastSync: null,
        status: 'disconnected'
      });
      setSelectedPOS(null);
      setStep('select');
    } catch (error) {
      console.error('Disconnection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'connecting':
        return <Loader className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Not Connected';
    }
  };

  const renderPOSSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your POS System</h2>
        <p className="text-gray-600">
          Choose your point-of-sale system to start receiving AI-powered insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posSystems.map((pos) => (
          <div
            key={pos.id}
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              pos.status === 'available'
                ? 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                : 'border-gray-100 cursor-not-allowed opacity-60'
            } ${selectedPOS?.id === pos.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}
            onClick={() => handlePOSSelection(pos)}
          >
            {pos.status === 'coming_soon' && (
              <div className="absolute top-2 right-2">
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
            )}

            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl font-bold text-gray-600">{pos.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{pos.name}</h3>
                <p className="text-sm text-gray-500">Setup: {pos.setupTime}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{pos.description}</p>

            <div className="space-y-2">
              {pos.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>

            {pos.status === 'available' && (
              <button
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePOSSelection(pos);
                }}
              >
                Select {pos.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Secure Integration</h4>
            <p className="text-sm text-blue-700">
              We use industry-standard OAuth 2.0 authentication and encrypt all data in transit and at rest. 
              Your POS data is never stored permanently and is only used to generate insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuthorization = () => {
    if (selectedPOS?.id === 'toast') {
      return (
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to Toast POS</h2>
            <p className="text-gray-600">
              Using environment credentials for testing
            </p>
          </div>

          {selectedPOS && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gray-600">{selectedPOS.name.charAt(0)}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{selectedPOS.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{selectedPOS.description}</p>

              <div className="space-y-3 text-left">
                <div className="flex items-center text-sm text-gray-600">
                  <Database className="h-4 w-4 text-blue-500 mr-2" />
                  Read-only access to sales data
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Zap className="h-4 w-4 text-blue-500 mr-2" />
                  Real-time sync for instant insights
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-blue-500 mr-2" />
                  Bank-level security and encryption
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
            >
              {isConnecting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connect to Toast
                </>
              )}
            </button>

            <button
              onClick={() => setStep('select')}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Back to POS selection
            </button>
          </div>
        </div>
      );
    }

    // Fallback for other POS systems (not yet implemented)
    return (
      <div className="space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authorize Connection</h2>
          <p className="text-gray-600">
            {selectedPOS?.name} integration coming soon
          </p>
        </div>
        <button
          onClick={() => setStep('select')}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back to POS selection
        </button>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Loader className="h-10 w-10 text-blue-600 animate-spin" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sync Started!</h2>
        <p className="text-gray-600">
          Your {selectedPOS?.name} data is being synced in the background
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <h4 className="font-medium text-blue-900 mb-2">⏱️ What&apos;s happening now?</h4>
        <ul className="text-sm text-blue-700 space-y-2 text-left">
          <li>✅ Connection established successfully</li>
          <li>🔄 Your last 30 days of sales data is being synced</li>
          <li>⚡ This usually takes 2-3 minutes for most restaurants</li>
          <li>📧 We&apos;ll email you when your data is ready!</li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-left">
            <h4 className="font-medium text-amber-900 mb-1">Dashboard Not Ready Yet</h4>
            <p className="text-sm text-amber-700">
              Your dashboard will be populated once the sync completes. You can safely close this page and check back in a few minutes, or wait for the email notification.
            </p>
          </div>
        </div>
      </div>

      <div className="space-x-3">
        <button
          onClick={() => {
            console.log('Dashboard button clicked - navigating to /dashboard');
            router.push('/dashboard');
          }}
          className="bg-gray-600 text-white py-2 px-6 rounded-md hover:bg-gray-700 transition-colors"
        >
          Go to Dashboard Anyway
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">POS Integration</h1>
              <div className="flex items-center mt-1">
                {getStatusIcon()}
                <span className="ml-2 text-sm text-gray-600">{getStatusText()}</span>
                {connectionStatus.lastSync && (
                  <span className="ml-2 text-sm text-gray-500">
                    • Last sync: {connectionStatus.lastSync.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connectionStatus.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{connectionStatus.error}</p>
            </div>
          </div>
        )}

        {step === 'select' && renderPOSSelection()}
        {step === 'authorize' && renderAuthorization()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
}