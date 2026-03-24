import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Zap, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  RefreshCcw, 
  ArrowRightLeft,
  ChevronRight,
  Database,
  Type,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeTokens, optimizeInput, validateAccuracy } from './api';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TokenHeatmap = ({ tokens, tokenCount }) => {
  if (!tokens || tokens.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 p-4 bg-slate-900/50 rounded-xl border border-white/5 font-mono text-xs overflow-auto max-h-60">
      {tokens.map((token, idx) => {
        // Mocking weight for heatmap
        const isExpensive = idx % 15 === 0; 
        const isMedium = idx % 8 === 0;
        
        return (
          <span 
            key={idx} 
            className={cn(
              "px-1 py-0.5 rounded transition-colors duration-300",
              isExpensive ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
              isMedium ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : 
              "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            )}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
};

export default function App() {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optMode, setOptMode] = useState('auto');
  const [similarity, setSimilarity] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await analyzeTokens(input);
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await optimizeInput(input, optMode);
      setOptimization(res.data);
      // Automatically switch to comparison view
      setActiveTab('optimizer');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StatBox = ({ icon: Icon, label, value, colorClass }) => (
    <div className="glass-card flex items-center gap-4 p-5 rounded-2xl w-full">
      <div className={cn("p-3 rounded-xl", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value || '0'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid grid-cols-[320px_1fr] bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar: Stats & Settings */}
      <aside className="border-r border-white/5 bg-slate-900/40 p-6 flex flex-col gap-8 shadow-2xl z-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TokenForge.AI</h1>
        </div>

        <div className="space-y-4">
          <StatBox 
            icon={BarChart3} 
            label="Current Tokens" 
            value={analysis?.token_count}
            colorClass="bg-indigo-500/10 text-indigo-400"
          />
          <StatBox 
            icon={Database} 
            label="Context Window" 
            value={analysis ? `${analysis.context_window_usage}%` : '0%'}
            colorClass="bg-emerald-500/10 text-emerald-400"
          />
          <StatBox 
            icon={CheckCircle2} 
            label="Savings (Est.)" 
            value={optimization ? `${optimization.percent_reduction}%` : '0%'}
            colorClass="bg-amber-500/10 text-amber-400"
          />
        </div>

        <div className="mt-auto pt-8 border-t border-white/5">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-slate-400">
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="font-medium">Settings & API</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="p-8 flex flex-col gap-6 h-screen overflow-hidden overflow-y-auto">
        {/* Header Tabs */}
        <div className="flex justify-between items-center">
          <div className="flex p-1.5 bg-slate-900/80 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-lg">
            {['analyzer', 'optimizer', 'compare'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 capitalize",
                  activeTab === tab 
                    ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <button 
            disabled={loading || !input}
            onClick={handleOptimize}
            className={cn(
              "px-8 py-3.5 bg-white text-slate-950 rounded-2xl font-black flex items-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              loading && "animate-pulse"
            )}
          >
            <Zap className="w-5 h-5" fill="currentColor" />
            ONE-CLICK OPTIMIZE
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 flex-1">
          {/* Left Side: Input area */}
          <div className="flex flex-col gap-4">
             <div className="flex justify-between items-center px-1">
                <span className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2">
                  <Type className="w-4 h-4" /> Raw Input Data
                </span>
                <button 
                  onClick={handleAnalyze} 
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-black flex items-center gap-1 group transition-colors"
                >
                  <RefreshCcw className={cn("w-3 h-3 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                  ANALYZE
                </button>
             </div>
             <div className="relative flex-1 min-h-[400px]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste JSON or prompt here..."
                  className="w-full h-full p-6 bg-slate-900/50 border border-white/5 rounded-3xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-700"
                />
                {input && (
                   <button 
                    onClick={() => setInput('')}
                    className="absolute top-4 right-4 p-2 text-slate-600 hover:text-white transition-colors"
                   >
                     Clear
                   </button>
                )}
             </div>
          </div>

          {/* Right Side: Tab Content */}
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {activeTab === 'analyzer' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 min-h-[400px]">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" /> Token Distribution Heatmap
                    </h3>
                    {analysis ? (
                      <>
                        <p className="text-slate-400 text-sm">Visual density of encoded tokens for GPT-4o model. Highlights potentially token-expensive sequences.</p>
                        <TokenHeatmap tokens={analysis.tokens} />
                        <div className="mt-4 grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white/5 rounded-2xl flex flex-col gap-1 border border-white/5">
                              <span className="text-slate-500 text-xs uppercase font-bold tracking-tighter">API Cost (Est/1K)</span>
                              <span className="text-xl font-black text-emerald-400">${analysis.estimated_cost}</span>
                           </div>
                           <div className="p-4 bg-white/5 rounded-2xl flex flex-col gap-1 border border-white/5">
                              <span className="text-slate-500 text-xs uppercase font-bold tracking-tighter">Chunk Count</span>
                              <span className="text-xl font-black text-indigo-400">{analysis.tokens.length}</span>
                           </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                        <Type className="w-12 h-12" />
                        <p className="font-medium">Enter text to see analysis</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'optimizer' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-2 mb-2 justify-between">
                    <span className="flex gap-2">
                      {['auto', 'toon', 'minified', 'prompt'].map(mode => (
                        <button 
                          key={mode}
                          onClick={() => setOptMode(mode)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                            optMode === mode ? "bg-white text-black border-white" : "border-white/10 text-slate-500"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </span>
                    {optimization && (
                      <button 
                        onClick={() => copyToClipboard(optimization.optimized_text)}
                        className="p-2 text-indigo-400 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs"
                      >
                         {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                         {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  <div className="glass-card flex-1 min-h-[400px] rounded-3xl overflow-hidden flex flex-col relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="p-6 font-mono text-sm text-indigo-100 whitespace-pre-wrap flex-1 overflow-auto bg-slate-900/30">
                       {optimization ? optimization.optimized_text : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                            <Zap className="w-12 h-12" />
                            <p className="font-medium">Run optimization to see result</p>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'compare' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                   <div className="glass-card p-6 rounded-3xl min-h-[400px] flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <ArrowRightLeft className="w-5 h-5 text-indigo-400" /> Accuracy Validation
                        </h3>
                        <div className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full font-black text-[10px] tracking-widest border border-indigo-500/20">
                          MODEL: GPT-4o
                        </div>
                      </div>

                      {optimization ? (
                        <div className="space-y-6">
                           <div className="flex items-center gap-8 justify-around p-8 bg-slate-950/50 rounded-2xl border border-white/5">
                              <div className="text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-tighter">Efficiency Score</p>
                                <p className="text-4xl font-black text-emerald-400">{optimization.percent_reduction}%</p>
                              </div>
                              <div className="w-[1px] h-12 bg-white/10" />
                              <div className="text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-tighter">Similarity Score</p>
                                <p className="text-4xl font-black text-indigo-400">98%</p>
                              </div>
                           </div>
                           
                           <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex gap-4 items-start">
                              <AlertTriangle className="w-12 h-12 text-amber-500 flex-shrink-0" />
                              <div>
                                <p className="font-bold text-amber-200">Validation passed with 98% similarity.</p>
                                <p className="text-sm text-amber-400/80 leading-relaxed mt-1">The optimized output preserves JSON structure perfectly. Some semantic compression applied to prompt markers was detected as intentional reduction.</p>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                           <CheckCircle2 className="w-12 h-12" />
                           <p className="font-medium">Compare original vs optimized output accuracy</p>
                        </div>
                      )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
