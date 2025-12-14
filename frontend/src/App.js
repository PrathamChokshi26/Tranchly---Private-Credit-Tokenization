import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AnalysisView from './pages/AnalysisView';
import EarningsView from './pages/EarningsView';
import IndustryMap from './pages/IndustryMap';
import PortfolioAnalyzer from './pages/PortfolioAnalyzer';
import KPIDashboard from './pages/KPIDashboard';
import RedFlags from './pages/RedFlags';
import Simulator from './pages/Simulator';
import ResearchWorkspace from './pages/ResearchWorkspace';
import ConsistencyEngine from './pages/ConsistencyEngine';
import EarningsQuality from './pages/EarningsQuality';
import { Toaster } from 'sonner';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analysis" element={<AnalysisView />} />
          <Route path="/earnings" element={<EarningsView />} />
          <Route path="/industry" element={<IndustryMap />} />
          <Route path="/portfolio" element={<PortfolioAnalyzer />} />
          <Route path="/kpi" element={<KPIDashboard />} />
          <Route path="/red-flags" element={<RedFlags />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/workspace" element={<ResearchWorkspace />} />
          <Route path="/consistency" element={<ConsistencyEngine />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;