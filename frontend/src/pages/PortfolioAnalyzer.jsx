import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Plus, Trash2, Loader2, PieChart } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PortfolioAnalyzer = () => {
  const navigate = useNavigate();
  const [portfolioName, setPortfolioName] = useState('My Portfolio');
  const [holdings, setHoldings] = useState([{ ticker: '', shares: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const addHolding = () => {
    setHoldings([...holdings, { ticker: '', shares: '', price: '' }]);
  };

  const removeHolding = (index) => {
    setHoldings(holdings.filter((_, i) => i !== index));
  };

  const updateHolding = (index, field, value) => {
    const updated = [...holdings];
    updated[index][field] = value;
    setHoldings(updated);
  };

  const analyzePortfolio = async () => {
    const validHoldings = holdings.filter(h => h.ticker && h.shares && h.price);
    
    if (validHoldings.length === 0) {
      toast.error('Please add at least one holding');
      return;
    }

    setLoading(true);
    try {
      const portfolioData = validHoldings.map(h => ({
        ticker: h.ticker,
        shares: parseFloat(h.shares),
        price: parseFloat(h.price),
        value: parseFloat(h.shares) * parseFloat(h.price)
      }));

      const response = await axios.post(`${API}/portfolio/analyze`, {
        name: portfolioName,
        holdings: portfolioData
      });
      setAnalysis(response.data.analysis);
      toast.success('Portfolio analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    if (analysis.analysis) {
      return (
        <Card className="glass-panel p-8 border-white/10">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {analysis.analysis}
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.diversification_score !== undefined && (
            <Card className="glass-panel p-6 border-white/10" data-testid="diversification-score">
              <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Diversification Score</h3>
              <div className="flex items-center space-x-4">
                <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {analysis.diversification_score}
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      style={{ width: `${analysis.diversification_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {analysis.overall_portfolio_health_score !== undefined && (
            <Card className="glass-panel p-6 border-white/10" data-testid="health-score">
              <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Portfolio Health</h3>
              <div className="flex items-center space-x-4">
                <div className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                  {analysis.overall_portfolio_health_score}
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                      style={{ width: `${analysis.overall_portfolio_health_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {analysis.sector_breakdown && (
          <Card className="glass-panel p-6 border-white/10" data-testid="sector-breakdown">
            <h3 className="text-lg font-semibold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Sector Breakdown</h3>
            <div className="text-gray-300">
              {typeof analysis.sector_breakdown === 'string' ? (
                <p>{analysis.sector_breakdown}</p>
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(analysis.sector_breakdown, null, 2)}</pre>
              )}
            </div>
          </Card>
        )}

        {Object.keys(analysis).map((key) => {
          if (['diversification_score', 'overall_portfolio_health_score', 'sector_breakdown', 'analysis'].includes(key)) return null;
          return (
            <Card key={key} className="glass-panel p-6 border-white/10">
              <h3 className="text-lg font-semibold mb-4 capitalize" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                {key.replace(/_/g, ' ')}
              </h3>
              <div className="text-gray-300">
                {typeof analysis[key] === 'string' ? (
                  <p className="leading-relaxed">{analysis[key]}</p>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(analysis[key], null, 2)}</pre>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#121214] to-[#0a0a0b] text-white">
      <div className="border-b border-white/10 backdrop-blur-xl bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                data-testid="back-btn"
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="icon"
                className="hover:bg-white/10 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Portfolio Analyzer</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {!analysis && (
          <Card className="glass-panel p-8 border-white/10 mb-8">
            <Input
              data-testid="portfolio-name-input"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              placeholder="Portfolio Name"
              className="mb-6 bg-white/5 border-white/10 text-white h-12 rounded-xl text-lg"
            />

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 px-2">
                <div className="col-span-4">Ticker</div>
                <div className="col-span-3">Shares</div>
                <div className="col-span-3">Price ($)</div>
                <div className="col-span-2"></div>
              </div>
              {holdings.map((holding, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center" data-testid={`holding-row-${index}`}>
                  <Input
                    data-testid={`ticker-input-${index}`}
                    value={holding.ticker}
                    onChange={(e) => updateHolding(index, 'ticker', e.target.value)}
                    placeholder="AAPL"
                    className="col-span-4 bg-white/5 border-white/10 text-white h-10 rounded-lg"
                  />
                  <Input
                    data-testid={`shares-input-${index}`}
                    value={holding.shares}
                    onChange={(e) => updateHolding(index, 'shares', e.target.value)}
                    placeholder="100"
                    type="number"
                    className="col-span-3 bg-white/5 border-white/10 text-white h-10 rounded-lg"
                  />
                  <Input
                    data-testid={`price-input-${index}`}
                    value={holding.price}
                    onChange={(e) => updateHolding(index, 'price', e.target.value)}
                    placeholder="150.00"
                    type="number"
                    step="0.01"
                    className="col-span-3 bg-white/5 border-white/10 text-white h-10 rounded-lg"
                  />
                  <Button
                    data-testid={`remove-holding-${index}`}
                    onClick={() => removeHolding(index)}
                    variant="ghost"
                    size="icon"
                    className="col-span-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                    disabled={holdings.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                data-testid="add-holding-btn"
                onClick={addHolding}
                variant="outline"
                className="border-white/20 hover:bg-white/5 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Holding
              </Button>
              <Button
                data-testid="analyze-portfolio-btn"
                onClick={analyzePortfolio}
                disabled={loading}
                className="bg-white text-black hover:bg-gray-200 rounded-xl px-8 flex-1"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PieChart className="w-5 h-5 mr-2" />}
                {loading ? 'Analyzing...' : 'Analyze Portfolio'}
              </Button>
            </div>
          </Card>
        )}

        {loading && (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing portfolio...</p>
            <p className="text-sm text-gray-500 mt-2">Calculating diversification and risk metrics</p>
          </Card>
        )}

        {analysis && !loading && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Analysis Results</h2>
              <Button
                data-testid="new-analysis-btn"
                onClick={() => {
                  setAnalysis(null);
                  setHoldings([{ ticker: '', shares: '', price: '' }]);
                }}
                variant="outline"
                className="border-white/20 hover:bg-white/5 text-white rounded-xl"
              >
                New Analysis
              </Button>
            </div>
            {renderAnalysis()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioAnalyzer;