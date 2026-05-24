import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { errToString } from '../lib/errors';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower');
    } catch (err) {
      setError(errToString(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">Tranchly</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all">
              {loading ? 'Signing in...' : 'Sign In'} {!loading && <ArrowRight className="inline ml-1" size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link to="/signup" className="text-purple-600 font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
