import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { Upload, FileText, TrendingUp, BarChart3, Shield, Zap, Brain, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Add axios request interceptor for debugging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request.url);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status);
    return response;
  },
  error => {
    console.error('Response Error:', error.message);
    return Promise.reject(error);
  }
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading toast
    toast.loading('Uploading document...', { id: 'upload' });
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      setUploadedFile(file.name);
      setDocumentId(response.data.document_id);
      
      // Store content for later use
      if (response.data.content_length) {
        console.log('Document uploaded with', response.data.content_length, 'characters');
      }
      
      toast.success('Document uploaded successfully! ✓', { id: 'upload' });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error('Upload failed: ' + errorMsg, { id: 'upload' });
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const analyzeText = async (type, navigateTo) => {
    if (!textInput && !documentId) {
      toast.error('Please upload a document or paste text first');
      return;
    }

    const content = textInput || 'Uploaded document content';
    sessionStorage.setItem('analysisContent', content);
    sessionStorage.setItem('analysisType', type);
    sessionStorage.setItem('documentId', documentId || '');
    navigate(navigateTo);
  };

  const useSampleData = () => {
    const sampleText = `Financial Statement Q4 2023
    
Revenue: $2.5 Billion (+15% YoY)
Cost of Revenue: $1.3 Billion
Gross Profit: $1.2 Billion (48% margin)
Operating Expenses: $750 Million
Operating Income: $450 Million (18% margin)
Net Income: $320 Million (13% margin)
EPS: $3.45 (+19% YoY)

Key Highlights:
- Strong revenue growth driven by new product launches
- Improved gross margins due to operational efficiency
- Working capital optimization with DSO reduced by 5 days
- Cash position of $800M, up from $650M last quarter`;

    setTextInput(sampleText);
    setActiveTab('paste');
    toast.success('Sample financial statement loaded! You can now analyze it.');
  };

  const tools = [
    { icon: <FileText className="w-6 h-6" />, label: 'Financial Statement', path: '/analysis', type: 'statement' },
    { icon: <TrendingUp className="w-6 h-6" />, label: 'Earnings Analysis', path: '/earnings', type: 'earnings' },
    { icon: <BarChart3 className="w-6 h-6" />, label: 'Industry Map', path: '/industry', type: 'industry' },
    { icon: <Shield className="w-6 h-6" />, label: 'Red Flags', path: '/red-flags', type: 'red_flags' },
    { icon: <Zap className="w-6 h-6" />, label: 'Portfolio', path: '/portfolio', type: 'portfolio' },
    { icon: <Brain className="w-6 h-6" />, label: 'Simulator', path: '/simulator', type: 'simulator' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#121214] to-[#0a0a0b] text-white">
      {/* Header */}
      <div className="border-b border-white/10 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button
                data-testid="home-btn"
                onClick={() => navigate('/')}
                variant="ghost"
                size="icon"
                className="hover:bg-white/10 rounded-full"
              >
                <Home className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Research Workspace</h1>
            </div>
            <Button
              data-testid="workspace-nav-btn"
              onClick={() => navigate('/workspace')}
              variant="outline"
              className="border-white/20 hover:bg-white/5 text-white rounded-full backdrop-blur-sm"
            >
              My Workspace
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Action Banner */}
        <Card className="glass-panel p-4 border-blue-500/30 bg-blue-500/5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Want to try without uploading?</p>
                <p className="text-xs text-gray-400">Use sample financial data to test the platform</p>
              </div>
            </div>
            <Button
              onClick={useSampleData}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
              data-testid="use-sample-data-btn"
            >
              Use Sample Data
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-panel p-8 border-white/10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl w-full">
                  <TabsTrigger
                    data-testid="upload-tab"
                    value="upload"
                    className="flex-1 data-[state=active]:bg-white/10 rounded-lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="paste-tab"
                    value="paste"
                    className="flex-1 data-[state=active]:bg-white/10 rounded-lg"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Paste Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-6" data-testid="upload-content">
                  <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                      loading 
                        ? 'border-blue-500/50 bg-blue-500/5' 
                        : 'border-white/20 hover:border-white/30 cursor-pointer'
                    }`}>
                      <input
                        data-testid="file-input"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.xlsx,.xls,.docx,.doc,.txt"
                        className="hidden"
                        id="file-upload"
                        disabled={loading}
                      />
                      <label htmlFor="file-upload" className={loading ? 'cursor-wait' : 'cursor-pointer'}>
                        {loading ? (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 relative">
                              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-lg font-medium mb-2 text-blue-400">Uploading document...</p>
                            <p className="text-sm text-gray-400">Please wait while we process your file</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium mb-2">Drop your file here or click to browse</p>
                            <p className="text-sm text-gray-400">Supports PDF, Excel, Word, and Text files</p>
                          </>
                        )}
                      </label>
                    </div>
                    {uploadedFile && !loading && (
                      <div data-testid="uploaded-file-display" className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-500">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <span className="text-sm">{uploadedFile}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-green-400">Ready</span>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-6" data-testid="paste-content">
                  <textarea
                    data-testid="text-input"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your financial statement, earnings transcript, or any financial data here..."
                    className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Tools Sidebar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-400 px-2">Analysis Tools</h3>
            <div className="space-y-3">
              {tools.map((tool, index) => (
                <button
                  key={index}
                  data-testid={`tool-${tool.type}-btn`}
                  onClick={() => analyzeText(tool.type, tool.path)}
                  className="w-full glass-panel p-4 flex items-center space-x-3 hover-lift group text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10">
                    <div className="text-blue-400">{tool.icon}</div>
                  </div>
                  <span className="font-medium">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;