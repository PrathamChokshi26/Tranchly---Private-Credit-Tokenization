import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Borrower
import BorrowerDashboard from './pages/borrower/BorrowerDashboard';
import LoanApplication from './pages/borrower/LoanApplication';
import LoanTracker from './pages/borrower/LoanTracker';
import CapitalPassport from './pages/borrower/CapitalPassport';

// Investor
import InvestorDashboard from './pages/investor/InvestorDashboard';
import Marketplace from './pages/investor/Marketplace';
import LoanDetail from './pages/investor/LoanDetail';
import SecondaryMarket from './pages/investor/SecondaryMarket';
import YieldHistory from './pages/investor/YieldHistory';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import ApplicationsQueue from './pages/admin/ApplicationsQueue';
import Analytics from './pages/admin/Analytics';
import AllLoans from './pages/admin/AllLoans';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full" /></div>;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower'} /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower'} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/borrower'} /> : <Signup />} />

      {/* Borrower */}
      <Route path="/borrower" element={<ProtectedRoute roles={['borrower']}><BorrowerDashboard /></ProtectedRoute>} />
      <Route path="/borrower/apply" element={<ProtectedRoute roles={['borrower']}><LoanApplication /></ProtectedRoute>} />
      <Route path="/borrower/loans" element={<ProtectedRoute roles={['borrower']}><BorrowerDashboard /></ProtectedRoute>} />
      <Route path="/borrower/loans/:loanId" element={<ProtectedRoute roles={['borrower']}><LoanTracker /></ProtectedRoute>} />
      <Route path="/borrower/passport" element={<ProtectedRoute roles={['borrower']}><CapitalPassport /></ProtectedRoute>} />

      {/* Investor */}
      <Route path="/investor" element={<ProtectedRoute roles={['investor']}><InvestorDashboard /></ProtectedRoute>} />
      <Route path="/investor/marketplace" element={<ProtectedRoute roles={['investor']}><Marketplace /></ProtectedRoute>} />
      <Route path="/investor/marketplace/:loanId" element={<ProtectedRoute roles={['investor']}><LoanDetail /></ProtectedRoute>} />
      <Route path="/investor/secondary" element={<ProtectedRoute roles={['investor']}><SecondaryMarket /></ProtectedRoute>} />
      <Route path="/investor/yield" element={<ProtectedRoute roles={['investor']}><YieldHistory /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute roles={['admin']}><ApplicationsQueue /></ProtectedRoute>} />
      <Route path="/admin/loans" element={<ProtectedRoute roles={['admin']}><AllLoans /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
