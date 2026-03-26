import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GradeBadge from '../../components/GradeBadge';
import { Tag, DollarSign, ShoppingCart, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function SecondaryMarket() {
  const { api, user } = useAuth();
  const [listings, setListings] = useState([]);
  const [myTokens, setMyTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse');
  const [sellModal, setSellModal] = useState(null);
  const [askingPrice, setAskingPrice] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/marketplace/secondary').then(r => setListings(r.data.listings)),
      api.get('/api/portfolio/tokens').then(r => setMyTokens(r.data.tokens)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleList = async (tokenId) => {
    setActionLoading(true);
    try {
      await api.post('/api/marketplace/list-token', { token_id: tokenId, asking_price: parseFloat(askingPrice) });
      setMessage({ type: 'success', text: 'Token listed for sale!' });
      setSellModal(null);
      setAskingPrice('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to list' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuy = async (listingId) => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/marketplace/buy-listing', { listing_id: listingId });
      setMessage({ type: 'success', text: `Token purchased! TX: ${res.data.tx_hash?.slice(0, 20)}...` });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Purchase failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" /></div>;

  const sellableTokens = myTokens.filter(t => t.status === 'sold');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Secondary Marketplace</h1>
        <p className="text-gray-500 text-sm">Buy and sell loan tokens from other investors</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <span className="flex items-center gap-1">{message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {message.text}</span>
          <button onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'browse' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          <ShoppingCart size={14} className="inline mr-1" /> Browse Listings ({listings.length})
        </button>
        <button onClick={() => setTab('sell')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'sell' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          <Tag size={14} className="inline mr-1" /> My Tokens ({sellableTokens.length})
        </button>
      </div>

      {tab === 'browse' ? (
        listings.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tokens listed for sale</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(l => (
              <div key={l.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{l.loan?.business_name}</p>
                    <p className="text-sm text-gray-500">{l.loan?.industry}</p>
                  </div>
                  <GradeBadge grade={l.loan?.grade} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Asking Price</p>
                    <p className="font-bold text-lg">${l.asking_price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Original</p>
                    <p className="font-bold text-lg text-gray-400">${l.original_price}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">APR: {l.loan?.interest_rate}%</p>
                {l.seller_id !== user?.id && (
                  <button onClick={() => handleBuy(l.id)} disabled={actionLoading}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                    Buy Token
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        sellableTokens.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Tag size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tokens available to sell</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sellableTokens.map(t => (
              <div key={t.id} className="bg-white rounded-xl border p-5">
                <p className="font-semibold text-gray-900">{t.loan?.business_name}</p>
                <p className="text-sm text-gray-500">Token #{t.token_index} • Paid ${t.price}</p>
                <GradeBadge grade={t.loan?.grade} size="sm" />
                
                {sellModal === t.id ? (
                  <div className="mt-3 space-y-2">
                    <input type="number" placeholder="Asking price" value={askingPrice} onChange={e => setAskingPrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => handleList(t.id)} disabled={actionLoading || !askingPrice}
                        className="flex-1 bg-teal-500 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">List</button>
                      <button onClick={() => { setSellModal(null); setAskingPrice(''); }} className="px-3 py-2 border rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setSellModal(t.id)} className="mt-3 w-full bg-teal-50 text-teal-700 py-2 rounded-lg text-sm font-semibold hover:bg-teal-100">
                    List for Sale
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
