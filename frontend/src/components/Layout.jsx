import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Wallet, Store, TrendingUp, Shield,
  BarChart3, Users, LogOut, Menu, X, ChevronRight, Landmark, CreditCard
} from 'lucide-react';

const borrowerNav = [
  { path: '/borrower', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/borrower/apply', icon: FileText, label: 'Apply for Loan' },
  { path: '/borrower/loans', icon: Landmark, label: 'My Loans' },
  { path: '/borrower/passport', icon: CreditCard, label: 'Capital Passport' },
];

const investorNav = [
  { path: '/investor', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/investor/marketplace', icon: Store, label: 'Marketplace' },
  { path: '/investor/secondary', icon: Wallet, label: 'Secondary Market' },
  { path: '/investor/yield', icon: TrendingUp, label: 'Yield History' },
];

const adminNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/applications', icon: FileText, label: 'Applications' },
  { path: '/admin/loans', icon: Landmark, label: 'All Loans' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'investor' ? investorNav : borrowerNav;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-400 rounded-lg flex items-center justify-center font-bold text-sm">S</div>
          <span className="text-xl font-bold">Slice</span>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center text-xs font-bold">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-2 w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          {user?.role === 'investor' && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Wallet size={14} />
              ${user?.usdc_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
