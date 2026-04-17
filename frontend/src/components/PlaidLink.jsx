import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { CheckCircle2, Loader2, Building2 } from 'lucide-react';

export default function PlaidLink({ api, userId, onSuccess, onError }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [bankData, setBankData] = useState(null);

  // Fetch link token on mount
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await api.post('/api/plaid/create-link-token', { user_id: userId });
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error('Failed to fetch Plaid link token:', error);
        if (onError) onError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkToken();
  }, [userId, api, onError]);

  const handleSuccess = useCallback(
    async (publicToken) => {
      setConnected(true);
      setAnalyzing(true);
      
      try {
        // Exchange token
        await api.post('/api/plaid/exchange-token', { public_token: publicToken });
        
        // Analyze banking data
        const analysisRes = await api.get('/api/plaid/analyze');
        setBankData(analysisRes.data);
        
        if (onSuccess) onSuccess(analysisRes.data);
      } catch (error) {
        console.error('Plaid analysis failed:', error);
        if (onError) onError(error);
      } finally {
        setAnalyzing(false);
      }
    },
    [api, onSuccess, onError]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      handleSuccess(publicToken);
    },
    onExit: (err) => {
      if (err) {
        console.error('Plaid Link exited with error:', err);
        if (onError) onError(err);
      }
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-lg bg-gray-50">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span className="text-gray-600">Loading Plaid...</span>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-lg bg-blue-50">
        <Loader2 className="animate-spin mr-2 text-blue-600" size={20} />
        <span className="text-blue-700 font-medium">Analyzing your banking data...</span>
      </div>
    );
  }

  if (connected && bankData) {
    return (
      <div className="p-4 border-2 border-emerald-200 rounded-lg bg-emerald-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={16} className="text-emerald-700" />
              <span className="font-semibold text-emerald-900">
                {bankData.institution_name || 'Bank'} (••••{bankData.account_last_four || '****'})
              </span>
              <span className="ml-auto px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full font-medium">
                LIVE DATA
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
              <div>
                <p className="text-gray-600">Balance</p>
                <p className="font-semibold text-gray-900">${bankData.bank_balance?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Buffer Days</p>
                <p className="font-semibold text-gray-900">{Math.round(bankData.cash_buffer_days)} days</p>
              </div>
              <div>
                <p className="text-gray-600">Transactions</p>
                <p className="font-semibold text-gray-900">{bankData.transaction_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Revenue Trend</p>
                <p className="font-semibold text-gray-900">
                  {bankData.revenue_trend >= 0 ? '+' : ''}{(bankData.revenue_trend * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-md"
    >
      <Building2 size={20} />
      {ready ? 'Connect Your Bank Account' : 'Initializing...'}
    </button>
  );
}
