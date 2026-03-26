import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Shield, Zap, TrendingUp, Users, Landmark, BarChart3, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Landing() {
  const [stats, setStats] = useState({ total_loans: 0, total_investors: 0, avg_yield: 11.5, total_invested: 0 });

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="text-xl font-bold text-gray-900">Slice</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
            <Link to="/signup" className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm">
              Get Started <ArrowRight className="inline ml-1" size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-teal-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <Zap size={14} /> Private Credit, Tokenized
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Invest in <span className="bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">real business loans</span> starting at $50
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Slice connects SME borrowers with retail investors through blockchain-backed loan tokens. 
              Earn yield from real business repayments. No middlemen, no minimums.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup" className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-200">
                Start Investing <ArrowRight className="inline ml-2" size={16} />
              </Link>
              <Link to="/signup" className="bg-white text-gray-700 px-6 py-3 rounded-xl text-base font-semibold border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all">
                Apply for a Loan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#0f172a] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Loans Originated', value: stats.total_loans || '0' },
            { label: 'Total Investors', value: stats.total_investors || '0' },
            { label: 'Avg. Yield (APR)', value: `${stats.avg_yield}%` },
            { label: 'Total Invested', value: `$${(stats.total_invested || 0).toLocaleString()}` },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl lg:text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How Slice Works</h2>
            <p className="mt-4 text-lg text-gray-500">Simple for borrowers. Powerful for investors.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* For Investors */}
            <div>
              <h3 className="text-lg font-bold text-purple-600 mb-6 flex items-center gap-2">
                <TrendingUp size={20} /> For Investors
              </h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Browse Loan Tokens', desc: 'Explore vetted SME loans graded A through C with transparent credit scores and projected yields.' },
                  { step: '02', title: 'Invest from $50', desc: 'Buy fractional loan tokens. Each token represents a slice of a real business loan earning interest.' },
                  { step: '03', title: 'Earn Yield Automatically', desc: 'As borrowers repay, yield is distributed to your wallet in USDC. Track everything in real-time.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Borrowers */}
            <div>
              <h3 className="text-lg font-bold text-teal-600 mb-6 flex items-center gap-2">
                <Landmark size={20} /> For Borrowers
              </h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Apply in Minutes', desc: 'Submit your business info and connect your bank data. Our AI scores your credit instantly.' },
                  { step: '02', title: 'Get Funded by the Crowd', desc: 'Once approved, investors buy tokens representing your loan. No banks, no gatekeepers.' },
                  { step: '03', title: 'Build Your Capital Passport', desc: 'Every on-time repayment builds your on-chain credit history — your Capital Passport NFT.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for Trust & Transparency</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Credit Scoring Engine', desc: '12-signal proprietary credit model analyzing cash flow, debt, maturity, and repayment history.', color: 'purple' },
              { icon: Zap, title: 'Mock Blockchain Layer', desc: 'Every transaction gets a verifiable hash. Token minting, transfers, and yield — all on-chain.', color: 'teal' },
              { icon: BarChart3, title: 'Real-time Yield Tracking', desc: 'Watch your earnings grow with every borrower repayment. Pro-rata distribution, automatically.', color: 'emerald' },
              { icon: Users, title: 'Secondary Marketplace', desc: 'Need liquidity? Sell your loan tokens to other investors at market price. Instant settlement.', color: 'blue' },
              { icon: Landmark, title: 'Capital Passport', desc: 'Borrowers build on-chain credit history. Better repayment = better rates = more capital.', color: 'amber' },
              { icon: TrendingUp, title: '8-18% APR', desc: 'Competitive yields backed by real business cash flows. Not DeFi ponzinomics — real revenue.', color: 'purple' },
            ].map((f, i) => {
              const Icon = f.icon;
              const bgColors = { purple: 'bg-purple-100 text-purple-600', teal: 'bg-teal-100 text-teal-600', emerald: 'bg-emerald-100 text-emerald-600', blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600' };
              return (
                <div key={i} className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColors[f.color]} mb-4`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Ready to slice into private credit?</h2>
          <p className="mt-4 text-lg text-gray-500">Join the future of lending. Whether you're growing a business or growing your portfolio.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-200">
              Create Account <ChevronRight className="inline ml-1" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="text-lg font-bold text-white">Slice</span>
          </div>
          <p className="text-sm">Private credit, tokenized. Connecting SME borrowers with retail investors through blockchain-backed loan tokens.</p>
          <div className="mt-6 pt-6 border-t border-slate-800 text-xs">&copy; {new Date().getFullYear()} Slice. All rights reserved. Mock blockchain — for demonstration purposes.</div>
        </div>
      </footer>
    </div>
  );
}
