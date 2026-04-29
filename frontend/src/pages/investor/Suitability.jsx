import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

const INCOME_BANDS = [
  { value: 'under_75k', label: 'Under $75,000' },
  { value: '75k_200k', label: '$75,000 – $200,000' },
  { value: 'over_200k', label: 'Over $200,000' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function Suitability() {
  const { api, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [acceptPrincipalRisk, setAcceptPrincipalRisk] = useState(false);
  const [understandTargets, setUnderstandTargets] = useState(false);
  const [canHoldTerm, setCanHoldTerm] = useState(false);
  const [incomeBand, setIncomeBand] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If already completed, redirect to marketplace
  if (user?.suitability_completed) {
    navigate('/investor/marketplace', { replace: true });
    return null;
  }

  const allChecked = acceptPrincipalRisk && understandTargets && canHoldTerm && incomeBand;

  const handleSubmit = async () => {
    if (!allChecked) {
      setError('Please complete all questions before continuing.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/users/me/suitability', {
        accept_principal_risk: acceptPrincipalRisk,
        understand_targets: understandTargets,
        can_hold_term: canHoldTerm,
        income_band: incomeBand,
      });
      if (refreshUser) await refreshUser();
      navigate('/investor/marketplace', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save your responses. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8" data-testid="suitability-page">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
          <Shield size={14} /> One-time Compliance Check
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Before you invest</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
          Tranchly is a private credit marketplace. Loans carry real risk. Please read each statement carefully and confirm you understand before continuing.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2" data-testid="suitability-warning">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <p>
          Tranchly loan investments are <strong>not FDIC insured</strong> and may result in <strong>loss of principal</strong>.
          Returns are not guaranteed. Past performance does not predict future results.
        </p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-100 p-6 space-y-5">
        <Question
          testid="q-principal-risk"
          number={1}
          text="I understand that loan investments are not FDIC insured and I may lose principal."
          options={[{ value: true, label: 'I understand and accept this risk' }]}
          selected={acceptPrincipalRisk}
          onSelect={() => setAcceptPrincipalRisk(true)}
        />

        <Question
          testid="q-understand-targets"
          number={2}
          text="I understand that returns are targets, not guarantees."
          options={[{ value: true, label: 'I understand' }]}
          selected={understandTargets}
          onSelect={() => setUnderstandTargets(true)}
        />

        <Question
          testid="q-hold-term"
          number={3}
          text="I am investing money I can afford to hold for the full loan term."
          options={[{ value: true, label: 'I confirm' }]}
          selected={canHoldTerm}
          onSelect={() => setCanHoldTerm(true)}
        />

        <div data-testid="q-income">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            <span className="text-gray-400 mr-2">4.</span>
            Annual income or net worth
          </p>
          <div className="space-y-2">
            {INCOME_BANDS.map(band => (
              <label
                key={band.value}
                data-testid={`income-band-${band.value}`}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  incomeBand === band.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="income"
                  value={band.value}
                  checked={incomeBand === band.value}
                  onChange={() => setIncomeBand(band.value)}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">{band.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-sm" data-testid="suitability-error">
          {error}
        </div>
      )}

      <button
        data-testid="btn-suitability-submit"
        onClick={handleSubmit}
        disabled={submitting || !allChecked}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl font-bold text-base hover:from-purple-700 hover:to-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? 'Saving…' : 'I Agree — Continue to Marketplace'}
      </button>

      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        By continuing you confirm you have read and understand the risks of investing in private credit on Tranchly.
        This screen is shown only once.
      </p>
    </div>
  );
}

function Question({ testid, number, text, options, selected, onSelect }) {
  return (
    <div data-testid={testid}>
      <p className="text-sm font-semibold text-gray-800 mb-2">
        <span className="text-gray-400 mr-2">{number}.</span>
        {text}
      </p>
      {options.map(opt => (
        <label
          key={String(opt.value)}
          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            selected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <input type="radio" checked={selected} onChange={onSelect} className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-gray-700 flex items-center gap-1.5">
            {selected && <CheckCircle2 size={14} className="text-emerald-600" />}
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}
