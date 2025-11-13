import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, TrendingUp, BarChart3, Shield, Zap, Brain, FileText } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Financial Statement Analysis',
      description: 'Break down complex statements into simple insights with AI-powered analysis'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Earnings Intelligence',
      description: 'Extract key insights from earnings calls, detect sentiment, and track guidance'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Industry Mapping',
      description: 'Visualize entire industries, value chains, and competitive dynamics'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Red Flag Detection',
      description: 'Automatically identify accounting anomalies and financial risks'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Portfolio Analytics',
      description: 'Comprehensive portfolio analysis with diversification and risk metrics'
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Business Simulator',
      description: 'Interactive modeling to understand how business drivers affect outcomes'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0b] via-[#121214] to-[#0a0a0b] text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        
        {/* Navigation */}
        <nav className="relative z-10 px-6 py-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xl font-semibold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>FinanceAI</span>
            </div>
            <Button
              data-testid="nav-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              className="bg-white/10 hover:bg-white/15 border border-white/10 text-white backdrop-blur-sm rounded-full px-6"
            >
              Open Dashboard
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className={`relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center space-y-8">
            <div className="inline-block">
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-gray-400">Powered by GPT-5</span>
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              <span className="gradient-text">The Future of</span>
              <br />
              <span className="text-white">Financial Research</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              An elegant, intelligent workspace that transforms complex financial statements,
              earnings reports, and market data into simple, actionable insights
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                data-testid="get-started-btn"
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-white text-black hover:bg-gray-200 rounded-full px-8 py-6 text-lg font-medium shadow-xl shadow-white/10 group"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                data-testid="workspace-btn"
                onClick={() => navigate('/workspace')}
                size="lg"
                variant="outline"
                className="border-white/20 hover:bg-white/5 text-white rounded-full px-8 py-6 text-lg backdrop-blur-sm"
              >
                Explore Features
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              data-testid={`feature-card-${index}`}
              className="glass-panel p-8 hover-lift cursor-pointer group"
              style={{
                animationDelay: `${index * 100}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/10">
                <div className="text-blue-400">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-32">
        <div className="glass-panel p-12 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            Ready to transform your research workflow?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Join the future of financial analysis. Start analyzing documents, tracking companies, and gaining insights in minutes.
          </p>
          <Button
            data-testid="cta-start-btn"
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="bg-white text-black hover:bg-gray-200 rounded-full px-8 py-6 text-lg font-medium shadow-xl shadow-white/10"
          >
            Start Free
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;