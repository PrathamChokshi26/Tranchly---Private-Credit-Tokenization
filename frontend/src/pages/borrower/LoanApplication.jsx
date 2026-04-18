import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, AlertTriangle, CheckCircle2, ArrowLeft, Award } from 'lucide-react';
import PlaidLink from '../../components/PlaidLink';
import StripeConnect from '../../components/StripeConnect';

const industries = ['Technology', 'Healthcare', 'Retail', 'Food & Beverage', 'Manufacturing', 'Construction', 'Real Estate', 'Professional Services', 'Education', 'Transportation', 'Agriculture', 'Entertainment', 'E-Commerce', 'SaaS', 'Fintech', 'Other'];

export default function LoanApplication() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [form, setForm] = useState({
    business_name: '', industry: 'Technology', years_operating: '', monthly_revenue: '',
    loan_amount_requested: '', loan_purpose: '', bank_balance: '', monthly_expenses: '',
    existing_debt: '0', existing_loans: '0', bureau_score: '680',
    revenue_trend: '0.05', customer_retention: '0.80', payroll_consistency: '0.85',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        ...form,
        years_operating: parseFloat(form.years_operating),
        monthly_revenue: parseFloat(form.monthly_revenue),
        loan_amount_requested: parseFloat(form.loan_amount_requested),
        bank_balance: form.bank_balance ? parseFloat(form.bank_balance) : null,
        monthly_expenses: form.monthly_expenses ? parseFloat(form.monthly_expenses) : null,
        existing_debt: parseFloat(form.existing_debt || 0),
        existing_loans: parseInt(form.existing_loans || 0),
        bureau_score: parseInt(form.bureau_score || 680),
        revenue_trend: parseFloat(form.revenue_trend || 0.05),
        customer_retention: parseFloat(form.customer_retention || 0.80),
        payroll_consistency: parseFloat(form.payroll_consistency || 0.85),
        industry: form.industry.toLowerCase().replace(/[& ]+/g, '_'),
      };
      const res = await api.post('/api/loans/apply', data);
      setResult(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = { A: 'text-emerald-600', B: 'text-teal-600', C: 'text-amber-600', Reject: 'text-red-600' };
  const gradeBg = { A: 'bg-emerald-50 border-emerald-200', B: 'bg-teal-50 border-teal-200', C: 'bg-amber-50 border-amber-200', Reject: 'bg-red-50 border-red-200' };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan Application</h1>
        <p className="text-gray-500 text-sm">Apply for $20K–$500K in business funding</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {['Business Info', 'Bank Data', 'Results'].map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step > i + 1 ? 'bg-emerald-100 text-emerald-700' : step === i + 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > i + 1 ? <CheckCircle2 size={14} /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">{i + 1}</span>}
              {s}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
              <select value={form.industry} onChange={e => set('industry', e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                {industries.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years Operating *</label>
              <input type="number" step="0.5" min="0" value={form.years_operating} onChange={e => set('years_operating', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Revenue ($) *</label>
              <input type="number" min="0" value={form.monthly_revenue} onChange={e => set('monthly_revenue', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="15000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount ($) *</label>
              <input type="number" min="20000" max="500000" value={form.loan_amount_requested} onChange={e => set('loan_amount_requested', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="50000" />
              <p className="text-xs text-gray-400 mt-1">$20,000 – $500,000</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Purpose *</label>
              <textarea value={form.loan_purpose} onChange={e => set('loan_purpose', e.target.value)} required rows={3}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Working capital, equipment purchase, expansion..." />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => {
              if (!form.business_name || !form.years_operating || !form.monthly_revenue || !form.loan_amount_requested || !form.loan_purpose) {
                setError('Please fill all required fields'); return;
              }
              setError(''); setStep(2);
            }} className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Connect Live Data Sources</h2>
            <p className="text-sm text-gray-500 mt-1">
              Connect your bank and revenue accounts for a better credit score. Live data provides up to +5% score boost.
            </p>
          </div>

          {/* Data Quality Benefit Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-purple-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="text-emerald-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-gray-900">Why connect live data?</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✓ Plaid + Stripe: <span className="font-semibold text-emerald-600">+5% score boost</span> (100% data quality)</li>
                  <li>✓ Plaid or Stripe: <span className="font-semibold text-blue-600">+3% score boost</span> (70% data quality)</li>
                  <li>✓ Manual only: No boost (40% data quality)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Plaid Banking Connection */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              Banking Data via Plaid
              {plaidConnected && <CheckCircle2 className="text-emerald-600" size={18} />}
            </h3>
            <PlaidLink
              api={api}
              onSuccess={() => setPlaidConnected(true)}
              onError={(err) => console.error('Plaid error:', err)}
            />
          </div>

          {/* Stripe Revenue Connection */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              Revenue Data via Stripe
              {stripeConnected && <CheckCircle2 className="text-purple-600" size={18} />}
            </h3>
            <StripeConnect
              api={api}
              onSuccess={() => setStripeConnected(true)}
              onError={(err) => console.error('Stripe error:', err)}
            />
          </div>

          {/* Manual Input (Optional Fallback) */}
          <div className="border-t pt-4">
            <details className="cursor-pointer">
              <summary className="font-medium text-gray-700 hover:text-gray-900">
                Or enter financial data manually (lower data quality score)
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Balance ($)</label>
                  <input type="number" min="0" value={form.bank_balance} onChange={e => set('bank_balance', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="30000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses ($)</label>
                  <input type="number" min="0" value={form.monthly_expenses} onChange={e => set('monthly_expenses', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="10000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Existing Debt ($)</label>
                  <input type="number" min="0" value={form.existing_debt} onChange={e => set('existing_debt', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"># Existing Loans</label>
                  <input type="number" min="0" value={form.existing_loans} onChange={e => set('existing_loans', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
            </details>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Submit Application'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-4">
          {/* Score Card */}
          <div className={`rounded-xl border-2 p-6 ${gradeBg[result.credit_score.grade]}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Credit Score Result</h2>
              <span className={`text-4xl font-black ${gradeColor[result.credit_score.grade]}`}>{result.credit_score.grade}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Composite Score</p>
                <p className="text-2xl font-bold">{result.credit_score.composite_score}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Suggested APR</p>
                <p className="text-2xl font-bold">{result.credit_score.suggested_apr}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Loan Amount</p>
                <p className="text-2xl font-bold">${result.credit_score.max_loan_amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-2xl font-bold capitalize">{result.status}</p>
              </div>
            </div>
            {result.credit_score.auto_reject_flags?.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 rounded-lg">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1"><AlertTriangle size={14} /> Auto-Reject Flags:</p>
                <ul className="text-sm text-red-600 mt-1 list-disc ml-5">
                  {result.credit_score.auto_reject_flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Data Quality Score */}
          {result.credit_score.data_quality && (
            <div className="bg-gradient-to-r from-emerald-50 to-purple-50 rounded-xl border-2 border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Data Quality Score</h3>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full font-bold text-sm">
                  {result.credit_score.data_quality.quality_score}/100
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Quality Grade</p>
                  <p className="text-lg font-bold text-gray-900">{result.credit_score.data_quality.quality_grade}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Score Boost</p>
                  <p className="text-lg font-bold text-emerald-600">+{result.credit_score.quality_boost?.toFixed(1) || 0} pts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Base Score</p>
                  <p className="text-lg font-bold text-gray-700">{result.credit_score.base_score?.toFixed(1) || result.credit_score.composite_score}</p>
                </div>
              </div>
              {result.credit_score.data_quality.data_sources?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Connected Data Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.credit_score.data_quality.data_sources.map((source, idx) => (
                      <div key={idx} className="px-3 py-2 bg-white rounded-lg border border-emerald-300 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-emerald-600" size={16} />
                          <span className="font-semibold">{source.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {source.institution || source.business_name || 'Connected'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Signal Breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Credit Signal Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(result.credit_score.signals || {}).map(([key, sig]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-bold">{sig.score}/100 ({sig.weight}% weight)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-400" style={{ width: `${sig.score}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {Object.entries(sig.details || {}).map(([dk, dv]) => (
                      <div key={dk} className="text-xs text-gray-500">
                        <span className="capitalize">{dk.replace(/_/g, ' ')}:</span> <span className="font-medium text-gray-700">{dv.value}</span> ({dv.score})
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/borrower')} className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold">
              Go to Dashboard
            </button>
            {result.status !== 'rejected' && (
              <button onClick={() => navigate(`/borrower/loans/${result.loan_id}`)} className="bg-white border text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
                View Loan Details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
