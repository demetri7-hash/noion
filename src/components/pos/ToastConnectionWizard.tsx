'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowRight,
  Info,
  Lock,
  Zap
} from 'lucide-react';

interface ToastCredentials {
  locationGuid: string;
  clientId: string;
  clientSecret: string;
}

interface ValidationState {
  locationGuid: boolean;
  clientId: boolean;
  clientSecret: boolean;
}

/**
 * User-Friendly Toast Connection Wizard
 * Makes it super easy for users to connect their Toast POS
 */
export default function ToastConnectionWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [credentials, setCredentials] = useState<ToastCredentials>({
    locationGuid: '',
    clientId: '',
    clientSecret: ''
  });
  const [validation, setValidation] = useState<ValidationState>({
    locationGuid: false,
    clientId: false,
    clientSecret: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Validate GUID format (Toast GUIDs are UUID format)
  const validateGuid = (guid: string): boolean => {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(guid);
  };

  // Validate Client ID (Toast uses alphanumeric format)
  const validateClientId = (id: string): boolean => {
    return id.length >= 20 && /^[A-Za-z0-9]+$/.test(id);
  };

  // Validate Client Secret
  const validateClientSecret = (secret: string): boolean => {
    return secret.length >= 32;
  };

  const handleInputChange = (field: keyof ToastCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value.trim() }));

    // Real-time validation
    let isValid = false;
    if (field === 'locationGuid') isValid = validateGuid(value.trim());
    if (field === 'clientId') isValid = validateClientId(value.trim());
    if (field === 'clientSecret') isValid = validateClientSecret(value.trim());

    setValidation(prev => ({ ...prev, [field]: isValid }));
  };

  const canProceedToStep3 = validation.locationGuid && validation.clientId && validation.clientSecret;

  const handleConnect = async () => {
    if (!canProceedToStep3) return;

    setIsConnecting(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch('/api/pos/toast/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Connection failed');
      }

      setStep(4); // Success!

    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please check your credentials and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔑</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Your Restaurant GUID</h2>
        <p className="text-gray-600">This takes about 30 seconds</p>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
          Open Toast Web
        </h3>
        <p className="text-gray-600 mb-3">Log in to your Toast account</p>
        <a
          href="https://pos.toasttab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          Open Toast Web
          <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
          Navigate to Your Location
        </h3>
        <div className="space-y-2 text-gray-600">
          <p>• Click <strong>Business and location management</strong></p>
          <p>• Click <strong>Location groups</strong></p>
          <p>• Select the <strong>Locations</strong> tab</p>
          <p>• Click on your restaurant name</p>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
          Copy Your GUID from the URL
        </h3>
        <p className="text-blue-700 mb-3">
          When your location page opens, look at the browser address bar.
          Your GUID is at the end of the URL after <code className="bg-blue-100 px-1 rounded">/locations/</code>
        </p>
        <div className="bg-white border border-blue-300 rounded p-3 font-mono text-sm text-gray-700">
          https://toast.../locations/<span className="bg-yellow-200">d3efae34-7c2e-4107-a442-49081e624706</span>
        </div>
        <p className="text-blue-600 text-sm mt-2">
          ☝️ The highlighted part is your Restaurant GUID - copy it!
        </p>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
      >
        I Have My GUID - Next Step
        <ArrowRight className="h-5 w-5 ml-2" />
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Your API Credentials</h2>
        <p className="text-gray-600">Create your Client ID and Secret in Toast</p>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
          Open Toast API Access
        </h3>
        <p className="text-gray-600 mb-3">In Toast Web, go to Integrations</p>
        <p className="text-gray-700 mb-3">
          <strong>Integrations</strong> → <strong>Toast API access</strong> → <strong>Manage credentials</strong>
        </p>
        <a
          href="https://pos.toasttab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
        >
          Open Toast Web
          <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
          Create New Credentials
        </h3>
        <div className="space-y-2 text-gray-600">
          <p>• Click <strong>Create new credentials</strong></p>
          <p>• Select <strong>Standard API</strong></p>
          <p>• Give it a name like "NOION Analytics"</p>
          <p>• Click <strong>Create</strong></p>
        </div>
      </div>

      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-4 flex items-center">
          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
          Copy Your Credentials
        </h3>
        <p className="text-green-700 mb-3">
          Toast will show you your <strong>Client ID</strong> and <strong>Client Secret</strong>
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start mb-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <strong>Important:</strong> Copy both now! Toast only shows the Client Secret once.
            If you lose it, you'll need to create new credentials.
          </p>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          I Have My Credentials
          <ArrowRight className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Credentials</h2>
        <p className="text-gray-600">Paste the information from Toast</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Restaurant GUID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            Restaurant GUID
            <div className="relative ml-2 group">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                Found in the URL after /locations/ when viewing your restaurant in Toast Web
              </div>
            </div>
          </label>
          <div className="relative">
            <input
              type="text"
              value={credentials.locationGuid}
              onChange={(e) => handleInputChange('locationGuid', e.target.value)}
              placeholder="d3efae34-7c2e-4107-a442-49081e624706"
              className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none transition-colors ${
                credentials.locationGuid === ''
                  ? 'border-gray-300 focus:border-blue-500'
                  : validation.locationGuid
                  ? 'border-green-500 focus:border-green-600'
                  : 'border-red-500 focus:border-red-600'
              }`}
            />
            {credentials.locationGuid && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {validation.locationGuid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            )}
          </div>
          {credentials.locationGuid && !validation.locationGuid && (
            <p className="text-red-600 text-sm mt-1">Invalid GUID format. Should look like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</p>
          )}
        </div>

        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            Client ID
            <div className="relative ml-2 group">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                From Toast Web → Integrations → Toast API access → Manage credentials
              </div>
            </div>
          </label>
          <div className="relative">
            <input
              type="text"
              value={credentials.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              placeholder="3g0R0NFYjHIQcVe9bYP8eTbJjwRTvCNV"
              className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none transition-colors ${
                credentials.clientId === ''
                  ? 'border-gray-300 focus:border-blue-500'
                  : validation.clientId
                  ? 'border-green-500 focus:border-green-600'
                  : 'border-red-500 focus:border-red-600'
              }`}
            />
            {credentials.clientId && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {validation.clientId ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            )}
          </div>
          {credentials.clientId && !validation.clientId && (
            <p className="text-red-600 text-sm mt-1">Client ID should be at least 20 characters</p>
          )}
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            Client Secret
            <div className="relative ml-2 group">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                Only shown once when creating credentials. Keep it secure!
              </div>
            </div>
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={credentials.clientSecret}
              onChange={(e) => handleInputChange('clientSecret', e.target.value)}
              placeholder="Enter your client secret"
              className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none transition-colors pr-24 ${
                credentials.clientSecret === ''
                  ? 'border-gray-300 focus:border-blue-500'
                  : validation.clientSecret
                  ? 'border-green-500 focus:border-green-600'
                  : 'border-red-500 focus:border-red-600'
              }`}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
              {credentials.clientSecret && (
                validation.clientSecret ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )
              )}
            </div>
          </div>
          {credentials.clientSecret && !validation.clientSecret && (
            <p className="text-red-600 text-sm mt-1">Client secret should be at least 32 characters</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Lock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Your Credentials Are Secure</h4>
            <p className="text-sm text-blue-700">
              We encrypt your credentials using bank-level AES-256 encryption before storing them.
              They're only used to sync your Toast data and are never shared with anyone.
            </p>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep(2)}
          disabled={isConnecting}
          className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleConnect}
          disabled={!canProceedToStep3 || isConnecting}
          className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isConnecting ? (
            <>
              <Loader className="h-5 w-5 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              Connect Toast POS
              <Zap className="h-5 w-5 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connected Successfully! 🎉</h2>
        <p className="text-gray-600">
          Your Toast POS is now syncing with NOION
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
        <h4 className="font-medium text-green-900 mb-3">What happens next?</h4>
        <ul className="text-sm text-green-700 space-y-2 text-left">
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <span>Your last 30 days of sales data is being synced</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <span>AI is analyzing your data to find insights</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <span>This usually takes 2-3 minutes</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <span>We'll email you when your dashboard is ready!</span>
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <div className="flex items-start">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-left">
            <h4 className="font-medium text-blue-900 mb-1">Auto-Connect Enabled</h4>
            <p className="text-sm text-blue-700">
              Your Toast credentials are securely saved. We'll automatically sync your data
              every time you log in - no need to reconnect!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className="w-24 text-center">Get GUID</span>
          <span className="w-24 text-center">Get API Keys</span>
          <span className="w-24 text-center">Enter Info</span>
          <span className="w-24 text-center">Connect</span>
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}
