import React, { useState } from 'react';
import { CheckCircle2, Loader2, CreditCard, AlertTriangle } from 'lucide-react';

export default function StripeConnect({ api, onSuccess, onError }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stripeData, setStripeData] = useState(null);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Stripe API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify and connect Stripe account
      const connectRes = await api.post('/api/stripe/connect', { api_key: apiKey });
      setConnected(true);
      setAnalyzing(true);

      // Analyze revenue data
      const analysisRes = await api.get('/api/stripe/analyze');
      setStripeData(analysisRes.data);

      if (onSuccess) onSuccess(analysisRes.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to connect Stripe account';
      setError(errorMsg);
      if (onError) onError(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Stripe Secret Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_test_... or sk_live_..."
          className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          disabled={loading}
        />
        <p className="text-xs text-gray-500">
          Your API key is stored securely and only used to analyze revenue data for credit scoring.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading || !apiKey.trim()}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-md"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Connecting...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Connect Stripe Account
          </>
        )}
      </button>
    </div>
  );
}
