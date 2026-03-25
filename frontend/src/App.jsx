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
  Maximize2,
  Cpu,
  Layers,
  FileCode,
  ShieldCheck,
  ZapOff,
  Wand2,
  GanttChart,
  Globe,
  Lock,
  PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeTokens, optimizeInput, validateAccuracy, aiOptimize, runPlaygroundTest } from './api';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TokenHeatmap = ({ tokens }) => {
  if (!tokens || tokens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 p-5 glass-card rounded-2xl font-mono text-[10px] leading-relaxed overflow-auto max-h-[280px]">
      {tokens.map((token, idx) => {
        const isExpensive = idx % 12 === 0; const isMedium = idx % 7 === 0; const isRare = idx % 19 === 0;
        return (
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(idx * 0.005, 0.5) }} key={idx} 
            className={cn(
              "px-1.5 py-0.5 rounded cursor-default select-none border whitespace-pre-wrap transition-all duration-300",
              isExpensive ? "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/40" : 
              isRare ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 hover:bg-fuchsia-500/40" :
              isMedium ? "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/40" : 
              "bg-indigo-500/10 text-indigo-400 border-indigo-500/10 hover:bg-indigo-500/20"
            )}
            title={`Token index: ${idx}`}
          >
            {String(token).replace(' ', '·')}
          </motion.span>
        );
      })}
    </div>
  );
};

const Header = ({ activeTab, setActiveTab, onOptimize, loading, hasInput }) => {
  const tabs = [{ id: 'analyzer', label: 'Analyzer', icon: BarChart3 }, { id: 'optimizer', label: 'Optimizer', icon: Cpu }, { id: 'playground', label: 'Playground', icon: PlayCircle }];
  return (
    <header className="flex justify-between items-center mb-8 px-1">
      <nav className="flex p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all duration-500 flex items-center gap-2",
              activeTab === tab.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30" : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </nav>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading || !hasInput} onClick={onOptimize}
        className={cn("px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 shadow-2xl disabled:opacity-50 transition-all", loading && "animate-pulse")}>
        <div className="bg-white/20 p-1 rounded-lg"><Wand2 className={cn("w-4 h-4", loading && "animate-spin")} /></div>
        OPTIMIZE ENGINE
      </motion.button>
    </header>
  );
};

const StatCard = ({ icon: Icon, label, value, subValue, colorClass, gradient }) => (
  <div className="glass-card flex items-center gap-5 p-6 rounded-3xl group relative overflow-hidden">
    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-gradient-to-br", gradient)} />
    <div className={cn("p-4 rounded-2xl ring-1 ring-white/10 shadow-lg", colorClass)}><Icon className="w-6 h-6" /></div>
    <div className="relative z-10">
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <div className="flex items-baseline gap-2"><p className="text-2xl font-black tracking-tight text-white">{value || '0'}</p><span className="text-[10px] font-bold text-slate-600">{subValue}</span></div>
    </div>
  </div>
);

export default function App() {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optMode, setOptMode] = useState('auto');
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('DeepSeek');
  const [playgroundResponse, setPlaygroundResponse] = useState(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  const handleAnalyze = async () => { if (!input) return; setLoading(true); try { const res = await analyzeTokens(input); setAnalysis(res.data); } catch (err) { console.error(err); } finally { setLoading(false); } };

  const handleOptimize = async () => {
    if (!input) return;
    setLoading(true);
    try {
      let res;
      if (optMode === 'deep') {
        if (!apiKey) { alert('Enter API Key for Deep AI'); setLoading(false); return; }
        res = await aiOptimize(input, apiKey, selectedProvider);
      } else { res = await optimizeInput(input, optMode); }
      setOptimization(res.data);
      if (activeTab === 'analyzer') setActiveTab('optimizer');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  };

  const handleRunPlayground = async () => {
    const textToTest = optimization ? optimization.optimized_text : input;
    if (!textToTest || !apiKey) return;
    setPlaygroundLoading(true);
    try {
      const res = await runPlaygroundTest(textToTest, apiKey, selectedProvider);
      setPlaygroundResponse(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Playground failed'); } finally { setPlaygroundLoading(false); }
  };

  const copyToClipboard = (text) => { if (!text) return; navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen grid grid-cols-[380px_1fr] bg-[#020617] text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/40">
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <aside className="border-r border-white/5 bg-slate-900/20 backdrop-blur-xl p-8 flex flex-col gap-10 shadow-2xl relative z-10 overflow-y-auto">
        <div className="flex items-center gap-4 px-2">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)]"><Layers className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent uppercase">TokenForge</h1><p className="text-[10px] text-indigo-400 font-black tracking-[0.3em] uppercase opacity-80">Labs AI-Engine</p></div>
        </div>
        <div className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 px-2">Engine Config</h2>
          <div className="p-5 glass-card rounded-[2rem] flex flex-col gap-5">
             <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Target Model</label>
                <div className="grid grid-cols-2 gap-2">
                   {['OpenAI', 'DeepSeek', 'NVIDIA', 'OpenRouter'].map(p => (
                     <button key={p} onClick={() => setSelectedProvider(p)}
                       className={cn("px-3 py-2 rounded-xl text-[9px] font-black border transition-all", selectedProvider === p ? "bg-white text-black border-white" : "bg-white/5 text-slate-400 border-white/5")}>
                       {p}
                     </button>
                   ))}
                </div>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-center pl-1"><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">API Credentials</label><Lock className="w-3 h-3 text-slate-700" /></div>
                <div className="relative group"><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Key for Playground / Deep AI..." className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-slate-300 focus:outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-slate-800" /></div>
                <p className="text-[9px] text-slate-600 font-bold leading-relaxed px-1">Keys strictly local. Only used for AI-powered optimization.</p>
             </div>
          </div>
        </div>
        <div className="space-y-4">
           <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 px-2">Mode Select</h2>
           <div className="grid grid-cols-2 gap-2">
              {[{ id: 'auto', label: 'Auto' }, { id: 'toon', label: 'Toon' }, { id: 'prompt', label: 'Prompt' }, { id: 'deep', label: 'Deep AI' }].map(mode => (
                <button key={mode.id} onClick={() => setOptMode(mode.id)}
                  className={cn("px-4 py-3 rounded-xl text-[10px] font-black border transition-all flex items-center justify-between group", optMode === mode.id ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-white/5 text-slate-500 border-white/5")}>
                  <span className="flex items-center gap-2">{mode.id === 'deep' && <Zap className={cn("w-3 h-3", optMode === 'deep' ? "text-amber-300 fill-amber-300" : "text-slate-500")} />}{mode.label}</span>
                  <div className={cn("w-1 h-1 rounded-full transition-all", optMode === mode.id ? "bg-white" : "bg-slate-700")} />
                </button>
              ))}
           </div>
        </div>
        <div className="space-y-4">
          <StatCard icon={BarChart3} label="Input Tokens" value={analysis?.token_count} subValue="Weight" colorClass="bg-indigo-500/10 text-indigo-400 ring-indigo-500/20" gradient="from-indigo-500/20" />
          <StatCard icon={Zap} label="Reduction" value={optimization ? `${optimization.percent_reduction}%` : '0%'} subValue="Efficiency" colorClass="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" gradient="from-emerald-500/20" />
        </div>
      </aside>
      <main className="p-10 flex flex-col h-screen overflow-hidden overflow-y-auto custom-scrollbar">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} onOptimize={handleOptimize} loading={loading} hasInput={!!input} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1">
          <div className="flex flex-col gap-6">
             <div className="flex justify-between items-center px-1"><span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 flex items-center gap-2"><FileCode className="w-3.5 h-3.5" /> Source Payload</span>
                <div className="flex gap-4">
                  <button onClick={() => setInput('')} className="text-[10px] font-black text-slate-700 hover:text-rose-400 uppercase">Clear</button>
                  <button onClick={handleAnalyze} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase flex items-center gap-2"><RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Analyze</button>
                </div>
             </div>
             <div className="relative group flex-1 min-h-[400px]">
                <div className="absolute inset-0 bg-indigo-500/2 rounded-[2.5rem] border border-white/5" />
                <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste JSON or Prompt text here..." className="w-full h-full p-10 bg-transparent text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none absolute z-10 placeholder:text-slate-800" />
             </div>
          </div>
          <div className="flex flex-col gap-6 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'analyzer' && (
                <motion.div key="analyzer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8 h-full">
                  <div className="glass-card p-10 rounded-[2.5rem] flex flex-col gap-8 flex-1 min-h-[400px]">
                    <h3 className="text-xl font-black text-white flex items-center gap-3"><BarChart3 className="w-6 h-6 text-indigo-400" /> Token Map</h3>
                    {analysis ? (
                      <div className="flex flex-col gap-8">
                        <TokenHeatmap tokens={analysis.tokens} />
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-5 bg-slate-950/50 rounded-2xl border border-white/5"><span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Normalized Cost</span><p className="text-2xl font-black text-white">${analysis.estimated_cost}</p></div>
                           <div className="p-5 bg-slate-950/50 rounded-2xl border border-white/5"><span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Sequence Chunks</span><p className="text-2xl font-black text-white">{analysis.tokens.length}</p></div>
                        </div>
                        <div className="space-y-4 pt-2">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Cost Comparison</h4>
                           <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
                              <table className="w-full text-[10px] text-left"><tbody className="divide-y divide-white/5">
                                    {analysis.multi_model_costs.map((comp, idx) => (
                                       <tr key={idx} className="hover:bg-white/5"><td className="px-6 py-3 font-bold text-slate-400 capitalize">{comp.model.replace('-', ' ')}</td><td className="px-6 py-3 text-right font-black text-white">${comp.cost.toFixed(6)}</td></tr>
                                    ))}</tbody></table>
                           </div>
                        </div>
                      </div>
                    ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-800 gap-6"><RefreshCcw className="w-12 h-12 opacity-20" /><p className="font-black text-[10px] uppercase tracking-[0.4em]">Engine Standby</p></div> )}
                  </div>
                </motion.div>
              )}
              {activeTab === 'optimizer' && (
                <motion.div key="optimizer" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex flex-col gap-6 h-full">
                  <div className="flex justify-end">{optimization && ( <button onClick={() => copyToClipboard(optimization.optimized_text)} className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-indigo-500/20"> {copied ? 'Success' : 'Copy Optimized Payload'} </button> )}</div>
                  <div className="glass-card flex-1 min-h-[500px] rounded-[2.5rem] overflow-hidden flex flex-col"><div className="p-10 font-mono text-xs text-indigo-200/80 whitespace-pre-wrap flex-1 overflow-auto bg-[#020617]/50">{optimization ? optimization.optimized_text : ( <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-8"><Cpu className="w-16 h-16 opacity-20" /><p className="font-black text-[10px] uppercase tracking-[0.5em]">Pipeline Ready</p></div> )}</div></div>
                </motion.div>
              )}
              {activeTab === 'playground' && (
                <motion.div key="playground" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-8 h-full">
                   <div className="glass-card p-10 rounded-[2.5rem] flex flex-col gap-10 flex-1 overflow-y-auto">
                      <h3 className="text-xl font-black text-white flex items-center gap-4"><PlayCircle className="w-7 h-7 text-emerald-400" /> API Playground</h3>
                      <div className="grid gap-8">
                        <div className="p-10 bg-[#020617]/80 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 items-center text-center">
                           <div className="p-6 rounded-full bg-emerald-500/5 ring-1 ring-emerald-500/20"><PlayCircle className={cn("w-12 h-12 text-emerald-500", playgroundLoading && "animate-spin")} /></div>
                           <div className="space-y-2"><h4 className="font-black text-white">Live Execution: {selectedProvider}</h4><p className="text-xs text-slate-500 max-w-xs mx-auto">This will send the currently optimized prompt to {selectedProvider} to verify its semantic integrity.</p></div>
                           <button onClick={handleRunPlayground} disabled={!apiKey || playgroundLoading} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest disabled:opacity-20 transition-all hover:scale-105"> {playgroundLoading ? 'Executing...' : 'Run Live Test'} </button>
                        </div>
                        {playgroundResponse && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 glass-card rounded-[2.5rem] border-emerald-500/20 bg-emerald-500/5 space-y-4">
                             <div className="flex justify-between items-center"><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Model Response</span> <span className="text-[10px] font-bold text-slate-500">{playgroundResponse.tokens_used} Tokens Consumed</span></div>
                             <p className="text-sm text-slate-300 leading-relaxed font-mono bg-black/40 p-6 rounded-2xl border border-white/5">{playgroundResponse.response}</p>
                          </motion.div>
                        )}
                      </div>
                      <div className="p-6 glass-card rounded-2xl flex gap-4 mt-auto"><AlertTriangle className="w-6 h-6 text-amber-500/50" /><p className="text-[10px] text-slate-500 font-medium leading-relaxed">Playground results confirm that the {optMode.toUpperCase()} optimization maintains full logical clarity for the model. Always verify critical data before production scaling.</p></div>
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
