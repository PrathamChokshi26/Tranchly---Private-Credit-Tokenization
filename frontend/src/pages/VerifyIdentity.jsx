import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Loader2, CheckCircle2, AlertCircle, XCircle, Lock } from 'lucide-react';

const PERSONA_TEMPLATE_ID = process.env.REACT_APP_PERSONA_TEMPLATE_ID;
const PERSONA_ENV = process.env.REACT_APP_PERSONA_ENV || 'sandbox';

export default function VerifyIdentity() {
  const { api, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | loading | verifying | success | failed | cancelled
  const [error, setError] = useState('');
  const personaClientRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  // If already verified, redirect
  useEffect(() => {
    if (user?.kyc_status === 'verified') {
      const dest = user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower';
      navigate(dest);
    }
  }, [user, navigate]);

  // Load Persona SDK script
  useEffect(() => {
    if (scriptLoadedRef.current) return;
    if (document.getElementById('persona-sdk-script')) {
      scriptLoadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.id = 'persona-sdk-script';
    script.src = 'https://cdn.withpersona.com/dist/persona-v4.8.0.js';
    script.async = true;
    script.onload = () => { scriptLoadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  const startVerification = () => {
    setStatus('loading');
    setError('');

    const waitForPersona = () => {
      if (window.Persona) {
        launchPersona();
      } else {
        setTimeout(waitForPersona, 200);
      }
    };
    waitForPersona();
  };

  const launchPersona = () => {
    try {
      const client = new window.Persona.Client({
        templateId: PERSONA_TEMPLATE_ID,
        environment: PERSONA_ENV,
        referenceId: user?.id,
        onReady: () => {
          setStatus('verifying');
          client.open();
        },
        onComplete: ({ inquiryId }) => {
          setStatus('loading');
          completeVerification(inquiryId);
        },
        onFail: ({ inquiryId }) => {
          setStatus('failed');
          setError('Verification was unsuccessful. Please try again or contact hello@tranchly.finance.');
        },
        onCancel: () => {
          setStatus('cancelled');
        },
        onError: (error) => {
          console.error('Persona error:', error);
          setStatus('failed');
          setError('An error occurred during verification. Please try again.');
        },
      });
      personaClientRef.current = client;
    } catch (err) {
      console.error('Failed to create Persona client:', err);
      setStatus('failed');
      setError('Failed to load verification. Please refresh and try again.');
    }
  };

  const completeVerification = async (inquiryId) => {
    try {
      const res = await api.post('/api/kyc/complete', { inquiry_id: inquiryId });
      if (res.data.success) {
        setStatus('success');
        await refreshUser();
        setTimeout(() => navigate(res.data.redirect || '/'), 1500);
      } else {
        setStatus('failed');
        setError(res.data.message || 'Verification failed.');
      }
    } catch (err) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Failed to complete verification.');
    }
  };

  const handleSkipSandbox = async () => {
    setStatus('loading');
    try {
      const res = await api.post('/api/kyc/skip');
      if (res.data.success) {
        setStatus('success');
        await refreshUser();
        setTimeout(() => navigate(res.data.redirect || '/'), 1000);
      }
    } catch (err) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Skip failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">Tranchly</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify your identity</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Required before investing or borrowing. Takes under 2 minutes.<br />
              Your data is encrypted and never shared.
            </p>
          </div>

          {/* Status States */}
          {status === 'idle' && (
            <div className="space-y-3">
              <button onClick={startVerification}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                <Shield size={20} /> Start Verification
              </button>
              <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                <Lock size={12} /> Powered by Persona • Bank-level encryption
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center py-6">
              <Loader2 size={40} className="mx-auto text-purple-500 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Processing verification...</p>
              <p className="text-gray-400 text-sm">Please wait while we verify your identity</p>
            </div>
          )}

          {status === 'verifying' && (
            <div className="text-center py-6">
              <Loader2 size={40} className="mx-auto text-purple-500 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Verification in progress</p>
              <p className="text-gray-400 text-sm">Complete the identity check in the popup window</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-bold text-emerald-700">Identity Verified!</p>
              <p className="text-gray-500 text-sm mt-1">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <XCircle size={48} className="mx-auto text-red-400 mb-3" />
                <p className="text-lg font-bold text-red-700">Verification Failed</p>
                <p className="text-gray-500 text-sm mt-1">{error}</p>
              </div>
              <button onClick={() => { setStatus('idle'); setError(''); }}
                className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700">
                Try Again
              </button>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <AlertCircle size={48} className="mx-auto text-amber-400 mb-3" />
                <p className="text-lg font-bold text-gray-700">Verification Cancelled</p>
                <p className="text-gray-500 text-sm mt-1">You need to complete identity verification to use Tranchly.</p>
              </div>
              <button onClick={() => setStatus('idle')}
                className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700">
                Resume Verification
              </button>
            </div>
          )}

          {/* Sandbox skip button */}
          {PERSONA_ENV === 'sandbox' && status !== 'success' && status !== 'loading' && (
            <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
              <button onClick={handleSkipSandbox}
                className="w-full bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                Skip verification (sandbox only)
              </button>
              <p className="text-xs text-gray-400 text-center mt-1">Development mode — this button is hidden in production</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
