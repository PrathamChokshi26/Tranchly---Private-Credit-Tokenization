import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Shield, Zap, TrendingUp, Users, Landmark, BarChart3, ChevronRight, Clock, Award, MessageCircle, Percent } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BORROWER_NICHES = [
  { emoji: '🍕', title: 'Restaurants & Food Service' },
  { emoji: '💇', title: 'Salons & Beauty' },
  { emoji: '🚚', title: 'Trucking & Logistics' },
  { emoji: '⚕️', title: 'Medical & Dental Practices' },
  { emoji: '🛒', title: 'E-commerce Sellers' },
  { emoji: '🔨', title: 'Contractors & Trades' },
  { emoji: '🏪', title: 'Retail Stores' },
  { emoji: '💼', title: 'Professional Services' },
];

const SOCIAL_PROOF = [
  { icon: Clock, label: 'Decisions in minutes' },
  { icon: Shield, label: 'No collateral required for loans under $100K' },
  { icon: MessageCircle, label: 'Clear approval reasons' },
  { icon: Percent, label: 'Rates from 8% APR' },
];

export default function Landing() {
  const [stats, setStats] = useState({ total_loans: 0, total_investors: 0, avg_yield: 11.5, total_invested: 0 });

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">Tranchly</span>
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-6" data-testid="hero-eyebrow">
              <Zap size={14} /> $25K – $250K working capital for local businesses
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight" data-testid="hero-headline">
              Working capital for local businesses — <span className="bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">based on your real cash flow</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed" data-testid="hero-subheadline">
              Restaurants, service businesses, and local operators get funded based on what they actually earn — not just their credit score.
              Apply in minutes, get a decision today.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                data-testid="cta-primary"
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-200"
              >
                Check my funding options <ArrowRight className="inline ml-2" size={16} />
              </Link>
              <Link
                to="/signup"
                data-testid="cta-secondary"
                className="bg-white text-gray-700 px-6 py-3 rounded-xl text-base font-semibold border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all"
              >
                Invest in local businesses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-white border-y" data-testid="social-proof-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {SOCIAL_PROOF.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} />
                </div>
                <p className="text-sm text-gray-700 font-medium leading-tight">{p.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#0f172a] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Loans Originated', value: stats.total_loans || '0' },
            { label: 'Total Investors', value: stats.total_investors || '0' },
            { label: 'Avg. Target Return (APR)', value: `${stats.avg_yield}%` },
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
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How Tranchly Works</h2>
            <p className="mt-4 text-lg text-gray-500">Simple for borrowers. Powerful for investors.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* For Borrowers (4 steps) */}
            <div data-testid="how-it-works-borrower">
              <h3 className="text-lg font-bold text-teal-600 mb-6 flex items-center gap-2">
                <Landmark size={20} /> For Borrowers
              </h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Tell us about your business', desc: 'Basic info about your business, how long you\'ve been operating, and how much you need.' },
                  { step: '02', title: 'Connect your bank account', desc: 'We securely connect to your business bank via Plaid to analyze your real cash flow — read-only, no changes made.' },
                  { step: '03', title: 'Get your decision', desc: 'Our underwriting engine analyzes 12 signals from your real business data and gives you a clear decision with specific reasons.' },
                  { step: '04', title: 'Get funded', desc: 'Approved loans are funded through our investor network, typically within 3–5 business days.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Investors (3 steps) */}
            <div data-testid="how-it-works-investor">
              <h3 className="text-lg font-bold text-purple-600 mb-6 flex items-center gap-2">
                <TrendingUp size={20} /> For Investors
              </h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Browse verified loans', desc: 'Every loan on Tranchly has been underwritten using live bank and revenue data.' },
                  { step: '02', title: 'Invest from $50', desc: 'Buy fractional shares of individual loans or diversify across multiple businesses.' },
                  { step: '03', title: 'Earn distributions', desc: 'Receive monthly principal and interest payments as borrowers repay.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="bg-gray-50 py-20" data-testid="who-we-serve">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Who we serve</h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              Local businesses we love to fund.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {BORROWER_NICHES.map((n, i) => (
              <div
                key={i}
                data-testid={`niche-${i}`}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:border-teal-300 hover:shadow-md transition-all flex items-center gap-3"
              >
                <span className="text-3xl flex-shrink-0" aria-hidden="true">{n.emoji}</span>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{n.title}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-gray-600 max-w-2xl mx-auto" data-testid="who-we-serve-caption">
            <Award className="inline text-emerald-600 mr-1.5 align-text-bottom" size={16} />
            <strong>If your business has 6+ months of history and $3,000+ in monthly revenue, you may qualify.</strong>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for Trust & Transparency</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Credit Scoring Engine', desc: '12-signal proprietary credit model analyzing cash flow, debt, maturity, and repayment history.', color: 'purple' },
              { icon: Zap, title: 'Verified Transactions', desc: 'Every transaction is logged with a verifiable hash. Loan share issuance, transfers, and distributions — all auditable.', color: 'teal' },
              { icon: BarChart3, title: 'Real-time Distribution Tracking', desc: 'Watch repayment distributions arrive with every borrower payment. Pro-rata, automatically.', color: 'emerald' },
              { icon: Users, title: 'Secondary Marketplace', desc: 'Need liquidity? Sell your loan shares to other investors at market price. Instant settlement.', color: 'blue' },
              { icon: Landmark, title: 'Capital Passport', desc: 'Borrowers build a verified credit history. Better repayment = better rates = more capital.', color: 'amber' },
              { icon: TrendingUp, title: '8-18% Target APR', desc: 'Risk-adjusted returns backed by real business cash flows. Returns are not guaranteed; principal is at risk.', color: 'purple' },
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
      <section className="py-20 bg-gradient-to-br from-purple-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Ready to grow your local business?</h2>
          <p className="mt-4 text-lg text-gray-500">Apply in minutes. Get a real decision today.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-200">
              Check my funding options <ChevronRight className="inline ml-1" size={16} />
            </Link>
            <Link to="/signup" className="bg-white text-gray-700 px-8 py-3.5 rounded-xl text-base font-semibold border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all">
              Invest in local businesses
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-xs">T</div>
            <span className="text-lg font-bold text-white">Tranchly</span>
          </div>
          <p className="text-sm">Verified small-business cash flows. Transparent, fractional private credit.</p>
          <p className="text-xs mt-1">hello@tranchly.finance</p>

          {/* Risk disclosure */}
          <p className="text-[11px] mt-6 max-w-3xl leading-relaxed text-slate-500" data-testid="footer-risk-disclosure">
            Tranchly loan investments involve risk, including possible loss of principal.
            Returns are not guaranteed. This is not FDIC-insured. Tranchly is not a bank.
            Past performance does not predict future results. All loans carry risk of default;
            loan default may result in partial or total loss of invested capital.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-800 text-xs">&copy; {new Date().getFullYear()} Tranchly. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
