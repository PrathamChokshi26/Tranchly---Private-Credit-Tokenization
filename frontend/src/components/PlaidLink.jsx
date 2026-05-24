import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { CheckCircle2, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { errToString } from '../lib/errors';

export default function PlaidLink({ api, onSuccess, onError }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [bankData, setBankData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch link token on mount
  useEffect(() => {
    const fetchLinkToken = async () => {
      console.log('[Plaid] Fetching link token (auth via JWT)');
      try {
        // No need to send user_id - backend extracts it from JWT token
        const response = await api.post('/api/plaid/create-link-token');
        console.log('[Plaid] Link token response:', response.data);
        
        if (response.data && response.data.link_token) {
          setLinkToken(response.data.link_token);
          console.log('[Plaid] Link token set successfully');
        } else {
          throw new Error('No link token in response');
        }
      } catch (error) {
        console.error('[Plaid] Failed to fetch link token:', error);
        console.error('[Plaid] Error details:', error.response?.data || error.message);
        
        // Check for specific error types
        if (error.response?.status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(errToString(error, error.message || 'Failed to initialize Plaid'));
        }
        
        if (onError) onError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkToken();
  }, [api, onError]);

  const handleSuccess = useCallback(
    async (publicToken) => {
      console.log('[Plaid] Public token received, exchanging...');
      setConnected(true);
      setAnalyzing(true);
      
      try {
        // Exchange token
        await api.post('/api/plaid/exchange-token', { public_token: publicToken });
        console.log('[Plaid] Token exchanged successfully');
        
        // Analyze banking data
        console.log('[Plaid] Analyzing banking data...');
        const analysisRes = await api.get('/api/plaid/analyze');
        console.log('[Plaid] Analysis complete:', analysisRes.data);
        setBankData(analysisRes.data);
        
        if (onSuccess) onSuccess(analysisRes.data);
      } catch (error) {
        console.error('[Plaid] Analysis failed:', error);
        setError(errToString(error, 'Failed to analyze banking data'));
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
      console.log('[Plaid] Link flow completed successfully');
      handleSuccess(publicToken);
    },
    onExit: (err, metadata) => {
      console.log('[Plaid] Link flow exited:', { err, metadata });
      if (err) {
        console.error('[Plaid] Link exited with error:', err);
        setError('Plaid connection cancelled or failed');
        if (onError) onError(err);
      }
    },
  });

  console.log('[Plaid] Component state:', { loading, linkToken: !!linkToken, ready, connected, error });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-lg bg-gray-50">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span className="text-gray-600">Initializing Plaid...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-600" size={20} />
          <span className="font-semibold text-red-900">Plaid Connection Error</span>
        </div>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            window.location.reload();
          }}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Try Again
        </button>
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
                Verified Data
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
      onClick={() => {
        console.log('[Plaid] Opening Plaid Link...');
        open();
      }}
      disabled={!ready || !linkToken}
      className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
    >
      {!linkToken ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          Initializing...
        </>
      ) : !ready ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          Loading...
        </>
      ) : (
        <>
          <Building2 size={20} />
          Connect Your Bank Account
        </>
      )}
    </button>
  );
}
