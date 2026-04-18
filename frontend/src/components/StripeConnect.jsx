import React, { useState } from 'react';
import { CheckCircle2, Loader2, CreditCard, AlertTriangle, ExternalLink } from 'lucide-react';

export default function StripeConnect({ api, onSuccess, onError }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stripeData, setStripeData] = useState(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      // Initiate OAuth flow - redirect to Stripe
      const redirectUrl = `${window.location.origin}/stripe-callback`;
      const clientId = 'ca_test_your_client_id'; // TODO: Replace with actual Stripe Connect client_id
      
      // For now, show instructions since we need proper Stripe Connect setup
      setShowInstructions(true);
      setConnecting(false);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to connect Stripe account';
      setError(errorMsg);
      if (onError) onError(err);
      setConnecting(false);
    }
  };

  // Handle test key submission (temporary workaround)
  const handleTestKeySubmit = async (testKey) => {
    setAnalyzing(true);
    setError('');

    try {
      // Verify and connect
      const connectRes = await api.post('/api/stripe/connect', { api_key: testKey });
      console.log('[Stripe] Connected:', connectRes.data);
      setConnected(true);

      // Analyze revenue data
      console.log('[Stripe] Analyzing revenue data...');
      const analysisRes = await api.get('/api/stripe/analyze');
      console.log('[Stripe] Analysis complete:', analysisRes.data);
      setStripeData(analysisRes.data);

      if (onSuccess) onSuccess(analysisRes.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to connect Stripe account';
      setError(errorMsg);
      if (onError) onError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-lg bg-purple-50">
        <Loader2 className="animate-spin mr-2 text-purple-600" size={20} />
        <span className="text-purple-700 font-medium">Analyzing your revenue data...</span>
      </div>
    );
  }

  if (connected && stripeData) {
    return (
      <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-purple-600 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-purple-700" />
              <span className="font-semibold text-purple-900">
                {stripeData.business_name || 'Stripe Account'}
              </span>
              <span className="ml-auto px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
                LIVE DATA
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
              <div>
                <p className="text-gray-600">Avg Monthly Revenue</p>
                <p className="font-semibold text-gray-900">${stripeData.avg_monthly_revenue?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Current MRR</p>
                <p className="font-semibold text-gray-900">${stripeData.current_mrr?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Transactions</p>
                <p className="font-semibold text-gray-900">{stripeData.total_transactions}</p>
              </div>
              <div>
                <p className="text-gray-600">Revenue Trend</p>
                <p className="font-semibold text-gray-900">
                  {stripeData.revenue_trend >= 0 ? '+' : ''}{(stripeData.revenue_trend * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <StripeTestKeyInput 
        onSubmit={handleTestKeySubmit}
        onCancel={() => setShowInstructions(false)}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
      >
        {connecting ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Connecting to Stripe...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Connect Stripe Account
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Securely connect your Stripe account to analyze revenue data
      </p>
    </div>
  );
}

// Temporary workaround component for test key entry
function StripeTestKeyInput({ onSubmit, onCancel, error }) {
  const [testKey, setTestKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!testKey.trim()) return;
    setLoading(true);
    await onSubmit(testKey);
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900 mb-1">Stripe OAuth Setup Required</h4>
          <p className="text-sm text-yellow-800 mb-3">
            Stripe Connect OAuth is being configured. For testing, you can use a <strong>restricted test API key</strong> with read-only permissions.
          </p>
          <a 
            href="https://dashboard.stripe.com/test/apikeys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium mb-3"
          >
            <ExternalLink size={14} />
            Get your test key from Stripe Dashboard
          </a>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stripe Test API Key (starts with sk_test_)
        </label>
        <input
          type="password"
          value={testKey}
          onChange={(e) => setTestKey(e.target.value)}
          placeholder="sk_test_..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
          disabled={loading}
        />
        <p className="text-xs text-gray-600 mt-1">
          ⚠️ Test keys only. Production OAuth flow will replace this.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-sm">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !testKey.trim()}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm"
        >
          {loading ? 'Connecting...' : 'Connect with Test Key'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
