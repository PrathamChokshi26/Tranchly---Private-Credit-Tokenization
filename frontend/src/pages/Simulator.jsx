import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Slider } from '../components/ui/slider';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Simulator = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [revenueGrowth, setRevenueGrowth] = useState(10);
  const [grossMargin, setGrossMargin] = useState(50);
  const [operatingLeverage, setOperatingLeverage] = useState(1.5);
  const [capexIntensity, setCapexIntensity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runSimulation = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/simulate`, {
        company_name: companyName,
        revenue_growth: revenueGrowth,
        gross_margin: grossMargin,
        operating_leverage: operatingLeverage,
        capex_intensity: capexIntensity
      });
      setResult(response.data.result);
      toast.success('Simulation complete!');
    } catch (error) {
      toast.error('Simulation failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.analysis) {
      return (
        <Card className="glass-panel p-8 border-white/10">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {result.analysis}
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {Object.keys(result).map((key) => (
          <Card key={key} className="glass-panel p-6 border-white/10" data-testid={`result-${key}`}>
            <h3 className="text-lg font-semibold mb-4 capitalize" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {key.replace(/_/g, ' ')}
            </h3>
            <div className="text-gray-300 leading-relaxed">
              {typeof result[key] === 'string' ? (
                <p>{result[key]}</p>
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(result[key], null, 2)}</pre>
              )}
            </div>
          </Card>
        ))}
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
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Business Model Simulator</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <Card className="glass-panel p-8 border-white/10 h-fit sticky top-8">
            <h2 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Simulation Parameters</h2>
            
            <div className="space-y-8">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Company Name</label>
                <Input
                  data-testid="company-name-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="bg-white/5 border-white/10 text-white h-11 rounded-xl"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm text-gray-400">Revenue Growth</label>
                  <span className="text-sm font-semibold text-blue-400" data-testid="revenue-growth-value">{revenueGrowth}%</span>
                </div>
                <Slider
                  data-testid="revenue-growth-slider"
                  value={[revenueGrowth]}
                  onValueChange={(v) => setRevenueGrowth(v[0])}
                  min={-20}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm text-gray-400">Gross Margin</label>
                  <span className="text-sm font-semibold text-blue-400" data-testid="gross-margin-value">{grossMargin}%</span>
                </div>
                <Slider
                  data-testid="gross-margin-slider"
                  value={[grossMargin]}
                  onValueChange={(v) => setGrossMargin(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm text-gray-400">Operating Leverage</label>
                  <span className="text-sm font-semibold text-blue-400" data-testid="operating-leverage-value">{operatingLeverage.toFixed(1)}x</span>
                </div>
                <Slider
                  data-testid="operating-leverage-slider"
                  value={[operatingLeverage]}
                  onValueChange={(v) => setOperatingLeverage(v[0])}
                  min={0.5}
                  max={5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm text-gray-400">CapEx Intensity</label>
                  <span className="text-sm font-semibold text-blue-400" data-testid="capex-intensity-value">{capexIntensity}%</span>
                </div>
                <Slider
                  data-testid="capex-intensity-slider"
                  value={[capexIntensity]}
                  onValueChange={(v) => setCapexIntensity(v[0])}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <Button
                data-testid="run-simulation-btn"
                onClick={runSimulation}
                disabled={loading}
                className="w-full bg-white text-black hover:bg-gray-200 rounded-xl h-12 text-lg font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results */}
          <div>
            {loading && (
              <Card className="glass-panel p-12 border-white/10 text-center" data-testid="loading-indicator">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
                <p className="text-lg text-gray-400">Running simulation...</p>
                <p className="text-sm text-gray-500 mt-2">Analyzing business model dynamics</p>
              </Card>
            )}

            {result && !loading && (
              <div>
                <h2 className="text-xl font-semibold mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Simulation Results</h2>
                {renderResult()}
              </div>
            )}

            {!result && !loading && (
              <Card className="glass-panel p-12 border-white/10 text-center">
                <div className="text-gray-400">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Adjust parameters and run simulation</p>
                  <p className="text-sm mt-2">See how changes in business drivers affect outcomes</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulator;