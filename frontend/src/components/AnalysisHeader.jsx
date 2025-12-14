import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AnalysisHeader = ({ title, subtitle, hasAnalysis, loading }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);

  const saveAnalysis = () => {
    // Analysis is auto-saved to backend during analysis
    // This just provides UI confirmation
    setIsSaved(true);
    toast.success('Analysis saved to workspace! Access it from "My Workspace"', {
      duration: 4000
    });
    
    // Reset after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
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
            <div>
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
          
          {hasAnalysis && !loading && (
            <div className="flex items-center space-x-3">
              {isSaved && (
                <span className="text-sm text-green-400 flex items-center space-x-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved</span>
                </span>
              )}
              <Button
                onClick={saveAnalysis}
                disabled={isSaved}
                className={`${isSaved ? 'bg-green-500/20 text-green-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full px-6 transition-all`}
                data-testid="save-analysis-btn"
              >
                {isSaved ? '✓ Saved' : 'Save to Workspace'}
              </Button>
              <Button
                onClick={() => navigate('/workspace')}
                variant="outline"
                className="border-white/20 hover:bg-white/5 text-white rounded-full px-6"
                data-testid="view-workspace-btn"
              >
                View Workspace
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisHeader;
