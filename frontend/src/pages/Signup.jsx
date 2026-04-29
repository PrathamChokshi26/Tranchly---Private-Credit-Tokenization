import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowRight, Landmark, TrendingUp } from 'lucide-react';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) { setError('Please select a role'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await signup(form.email, form.password, form.full_name, form.role);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">Tranchly</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Join Tranchly as a borrower or investor</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button type="button" onClick={() => set('role', 'borrower')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.role === 'borrower' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <Landmark size={24} className={form.role === 'borrower' ? 'text-teal-600' : 'text-gray-400'} />
              <p className="font-semibold text-sm mt-2">I'm a Borrower</p>
              <p className="text-xs text-gray-500">Get funding for my business</p>
            </button>
            <button type="button" onClick={() => set('role', 'investor')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.role === 'investor' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <TrendingUp size={24} className={form.role === 'investor' ? 'text-purple-600' : 'text-gray-400'} />
              <p className="font-semibold text-sm mt-2">I'm an Investor</p>
              <p className="text-xs text-gray-500">Receive repayment distributions from real business loans</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-10" placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !form.role}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all">
              {loading ? 'Creating account...' : 'Create Account'} {!loading && <ArrowRight className="inline ml-1" size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-purple-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
