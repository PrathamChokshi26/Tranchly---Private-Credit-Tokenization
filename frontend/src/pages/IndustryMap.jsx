import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Search, Loader2, Building2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const IndustryMap = () => {
  const navigate = useNavigate();
  const [industryName, setIndustryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeIndustry = async () => {
    if (!industryName.trim()) {
      toast.error('Please enter an industry name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/analyze/industry`, {
        content: industryName,
        analysis_type: 'industry'
      });
      setAnalysis(response.data.result);
      toast.success('Industry analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title, content, icon) => {
    if (!content) return null;
    return (
      <Card className="glass-panel p-6 border-white/10">
        <div className="flex items-center space-x-3 mb-4">
          {icon}
          <h3 className="text-lg font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{title}</h3>
        </div>
        <div className="text-gray-300 leading-relaxed">
          {typeof content === 'string' ? (
            <p>{content}</p>
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(content, null, 2)}</pre>
          )}
        </div>
      </Card>
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Industry Intelligence</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <Card className="glass-panel p-8 border-white/10 mb-8">
          <div className="flex gap-4">
            <Input
              data-testid="industry-input"
              value={industryName}
              onChange={(e) => setIndustryName(e.target.value)}
              placeholder="Enter industry name (e.g., Electric Vehicles, Cloud Computing, Retail Banking)"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder-gray-500 h-12 rounded-xl"
              onKeyPress={(e) => e.key === 'Enter' && analyzeIndustry()}
            />
            <Button
              data-testid="analyze-btn"
              onClick={analyzeIndustry}
              disabled={loading}
              className="bg-white text-black hover:bg-gray-200 rounded-xl px-8 h-12"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </Card>

        {loading && (
          <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-lg text-gray-400">Analyzing industry dynamics...</p>
            <p className="text-sm text-gray-500 mt-2">Mapping value chains and competitive landscape</p>
          </Card>
        )}

        {analysis && !loading && (
          <div className="space-y-6">
            {analysis.analysis && (
              <Card className="glass-panel p-8 border-white/10">
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                  {analysis.analysis}
                </div>
              </Card>
            )}

            {!analysis.analysis && (
              <>
                {renderSection('Overview', analysis.overview, <Building2 className="w-6 h-6 text-blue-400" />)}
                {renderSection('Value Chain', analysis.value_chain, <TrendingUp className="w-6 h-6 text-green-400" />)}
                {renderSection('Key Drivers', analysis.drivers, <TrendingUp className="w-6 h-6 text-purple-400" />)}
                {renderSection('Competitive Landscape', analysis.competitive_landscape, <Building2 className="w-6 h-6 text-orange-400" />)}
                {renderSection('Top Players', analysis.top_players, <Building2 className="w-6 h-6 text-yellow-400" />)}
                {renderSection('Margin Trends', analysis.margin_trends, <TrendingUp className="w-6 h-6 text-blue-400" />)}
                {renderSection('Growth Opportunities', analysis.growth_opportunities, <TrendingUp className="w-6 h-6 text-green-400" />)}
                {renderSection('Key Risks', analysis.risks, <TrendingUp className="w-6 h-6 text-red-400" />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndustryMap;