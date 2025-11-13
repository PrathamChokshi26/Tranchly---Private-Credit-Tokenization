import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { Upload, FileText, TrendingUp, BarChart3, Shield, Zap, Brain, Home } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFile(file.name);
      setDocumentId(response.data.document_id);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
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
                    <div className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-white/30 transition-colors cursor-pointer">
                      <input
                        data-testid="file-input"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.xlsx,.xls,.docx,.doc,.txt"
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">Drop your file here or click to browse</p>
                        <p className="text-sm text-gray-400">Supports PDF, Excel, Word, and Text files</p>
                      </label>
                    </div>
                    {uploadedFile && (
                      <div data-testid="uploaded-file-display" className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <span className="text-sm">{uploadedFile}</span>
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
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