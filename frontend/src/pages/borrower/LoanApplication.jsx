import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, AlertTriangle, CheckCircle2, ArrowLeft, Award, Shield } from 'lucide-react';
import PlaidLink from '../../components/PlaidLink';
import StripeConnect from '../../components/StripeConnect';
import { errToString } from '../../lib/errors';

const industries = ['Technology', 'Healthcare', 'Retail', 'Food & Beverage', 'Manufacturing', 'Construction', 'Real Estate', 'Professional Services', 'Education', 'Transportation', 'Agriculture', 'Entertainment', 'E-Commerce', 'SaaS', 'Fintech', 'Other'];

export default function LoanApplication() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [plaidData, setPlaidData] = useState(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeData, setStripeData] = useState(null);
  const [form, setForm] = useState({
    business_name: '', industry: 'Technology', years_operating: '', monthly_revenue: '',
    loan_amount_requested: '', loan_purpose: '', bank_balance: '', monthly_expenses: '',
    existing_debt: '0', existing_loans: '0', bureau_score: '680',
    revenue_trend: '0.05', customer_retention: '0.80', payroll_consistency: '0.85',
    personal_guarantee: false, business_assets: '0',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handlePlaidSuccess = (data) => {
    setPlaidConnected(true);
    setPlaidData(data);
    setForm(prev => ({
      ...prev,
      bank_balance: data.bank_balance || prev.bank_balance,
      monthly_revenue: data.avg_monthly_revenue || prev.monthly_revenue,
      revenue_trend: data.revenue_trend !== undefined ? data.revenue_trend : prev.revenue_trend,
    }));
  };

  const handleStripeSuccess = (data) => {
    setStripeConnected(true);
    setStripeData(data);
    const stripeRevenue = Math.max(data.avg_monthly_revenue || 0, data.current_mrr || 0);
    setForm(prev => ({
      ...prev,
      monthly_revenue: stripeRevenue > parseFloat(prev.monthly_revenue || 0) ? stripeRevenue : prev.monthly_revenue,
      revenue_trend: data.revenue_trend !== undefined ? data.revenue_trend : prev.revenue_trend,
      customer_retention: data.revenue_consistency !== undefined ? data.revenue_consistency : prev.customer_retention,
    }));
  };

  const validateForm = () => {
    const errors = [];
    if (!form.business_name?.trim()) errors.push('Business Name is required');
    if (!form.years_operating || parseFloat(form.years_operating) <= 0) errors.push('Years Operating must be greater than 0');
    if (!form.loan_amount_requested || parseFloat(form.loan_amount_requested) < 20000) errors.push('Loan Amount must be at least $20,000');
    if (!form.loan_purpose?.trim()) errors.push('Loan Purpose is required');
    if (!plaidConnected) {
      if (!form.monthly_revenue || parseFloat(form.monthly_revenue) <= 0) errors.push('Monthly Revenue is required (or connect Plaid)');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setValidationErrors([]);
    if (!validateForm()) {
      setError('Please fix the validation errors below');
      return;
    }
    setLoading(true);
    try {
      const submissionData = {
        ...form,
        years_operating: parseFloat(form.years_operating),
        monthly_revenue: plaidData?.avg_monthly_revenue || parseFloat(form.monthly_revenue || 0),
        loan_amount_requested: parseFloat(form.loan_amount_requested),
        bank_balance: plaidData?.bank_balance || (form.bank_balance ? parseFloat(form.bank_balance) : null),
        monthly_expenses: form.monthly_expenses ? parseFloat(form.monthly_expenses) : null,
        existing_debt: parseFloat(form.existing_debt || 0),
        existing_loans: parseInt(form.existing_loans || 0),
        bureau_score: parseInt(form.bureau_score || 680),
        revenue_trend: plaidData?.revenue_trend || stripeData?.revenue_trend || parseFloat(form.revenue_trend || 0.05),
        customer_retention: stripeData?.revenue_consistency || parseFloat(form.customer_retention || 0.80),
        payroll_consistency: parseFloat(form.payroll_consistency || 0.85),
        industry: form.industry.toLowerCase().replace(/[& ]+/g, '_'),
        personal_guarantee: !!form.personal_guarantee,
        business_assets: parseFloat(form.business_assets || 0),
        plaid_connected: plaidConnected,
        plaid_data: plaidData || null,
        stripe_connected: stripeConnected,
        stripe_data: stripeData || null,
      };
      const res = await api.post('/api/loans/apply', submissionData);
      navigate('/borrower/results', { state: { result: res.data } });
    } catch (err) {
      setError(errToString(err, 'Application failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="loan-application-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tell us about your business</h1>
        <p className="text-gray-500 text-sm">Get a funding decision based on your real business performance</p>
      </div>

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

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2" data-testid="form-error-banner"><AlertTriangle size={16} /> {error}</div>}

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4" data-testid="validation-errors-banner">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertTriangle size={18} />
            Please fix the following errors:
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
            {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* ─── STEP 1 — BUSINESS INFO ─────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 space-y-4" data-testid="step-1-container">
          <h2 className="font-semibold text-gray-900">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input data-testid="input-business-name" type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
              <select data-testid="select-industry" value={form.industry} onChange={e => set('industry', e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                {industries.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years Operating *</label>
              <input data-testid="input-years-operating" type="number" step="0.5" min="0" value={form.years_operating} onChange={e => set('years_operating', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Revenue ($) *</label>
              <input data-testid="input-monthly-revenue" type="number" min="0" value={form.monthly_revenue} onChange={e => set('monthly_revenue', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="15000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount ($) *</label>
              <input data-testid="input-loan-amount" type="number" min="20000" max="500000" value={form.loan_amount_requested} onChange={e => set('loan_amount_requested', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="50000" />
              <p className="text-xs text-gray-400 mt-1">$20,000 – $500,000</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Purpose *</label>
              <textarea data-testid="input-loan-purpose" value={form.loan_purpose} onChange={e => set('loan_purpose', e.target.value)} required rows={3}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Working capital, equipment purchase, expansion..." />
            </div>

            {/* NEW V2 FIELDS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Credit Score (FICO)</label>
              <input data-testid="input-bureau-score" type="number" min="300" max="850" value={form.bureau_score} onChange={e => set('bureau_score', e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="680" />
              <p className="text-xs text-gray-400 mt-1">Range 300–850. 580+ required.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Assets Value ($)</label>
              <input data-testid="input-business-assets" type="number" min="0" value={form.business_assets} onChange={e => set('business_assets', e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="30000" />
              <p className="text-xs text-gray-400 mt-1">Equipment, inventory, receivables, etc.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-colors" data-testid="personal-guarantee-container">
                <input
                  data-testid="checkbox-personal-guarantee"
                  type="checkbox"
                  checked={form.personal_guarantee}
                  onChange={e => set('personal_guarantee', e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-purple-600" />
                    <span className="font-semibold text-gray-900">I agree to provide a personal guarantee</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A personal guarantee improves your rate by 1–2% and materially lowers downside risk for investors.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button data-testid="btn-step-1-next" onClick={() => {
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

      {/* ─── STEP 2 — BANK DATA ─────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border p-6 space-y-6" data-testid="step-2-container">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Connect your business accounts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Connect your bank and revenue accounts for a better credit score. Live data dramatically increases data quality.
            </p>
          </div>

          <div className="p-4 bg-gradient-to-r from-emerald-50 to-purple-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="text-emerald-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-gray-900">Why connect live data?</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✓ Plaid + Stripe: <span className="font-semibold text-emerald-600">highest data quality</span> (up to 100%)</li>
                  <li>✓ Plaid or Stripe only: <span className="font-semibold text-blue-600">partial data quality</span></li>
                  <li>✓ Manual only: lowest data quality — expect a lower grade</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              Bank account
              {plaidConnected && <CheckCircle2 className="text-emerald-600" size={18} />}
            </h3>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              Securely connect your business bank account. We use read-only access to analyze your cash flow — we cannot move money or make changes to your account.
            </p>
            <PlaidLink api={api} onSuccess={handlePlaidSuccess} onError={(err) => console.error('Plaid error:', err)} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              Revenue account
              {stripeConnected && <CheckCircle2 className="text-purple-600" size={18} />}
            </h3>
            <StripeConnect api={api} onSuccess={handleStripeSuccess} onError={(err) => console.error('Stripe error:', err)} />
          </div>

          <div className="border-t pt-4">
            <details className="cursor-pointer">
              <summary className="font-medium text-gray-700 hover:text-gray-900">
                Or enter financial data manually (lower data quality score)
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Balance ($)</label>
                  <input data-testid="input-bank-balance" type="number" min="0" value={form.bank_balance} onChange={e => set('bank_balance', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="30000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses ($)</label>
                  <input data-testid="input-monthly-expenses" type="number" min="0" value={form.monthly_expenses} onChange={e => set('monthly_expenses', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="10000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Existing Debt ($)</label>
                  <input data-testid="input-existing-debt" type="number" min="0" value={form.existing_debt} onChange={e => set('existing_debt', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"># Existing Loans</label>
                  <input data-testid="input-existing-loans" type="number" min="0" value={form.existing_loans} onChange={e => set('existing_loans', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
            </details>
          </div>

          <div className="flex justify-between pt-2">
            <button data-testid="btn-step-2-back" onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button data-testid="btn-submit-application" onClick={handleSubmit} disabled={loading}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Analyzing...' : 'Submit Application'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
