
import React, { useState, useEffect, useMemo } from 'react';
import { ToolType, ImageMetadata, ProjectImage, ViewType, SiteSettings } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, EyeIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon,
  ChevronRightIcon, BWIcon, BorderIcon, QrCodeIcon, SettingsIcon, ConvertIcon, InfoIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';
import * as geminiService from './services/geminiService.ts';

const DEFAULT_SETTINGS: SiteSettings = {
  title: "Imagerize",
  heroHeadline: "Precision Engine.",
  heroSubheadline: "Creative Flow.",
  heroDescription: "The professional-grade suite for non-destructive visual orchestration and neural image mastering.",
  programmerName: "Sujon Roy",
  programmerRole: "Founder & Creative Lead",
  programmerUrl: "https://facebook.com/sujonworld0",
  programmerImage: "https://cliply.co/wp-content/uploads/2021/07/452105030_HEART_DOODLES_400.gif",
  footerCopyright: "© 2024 IMAGERIZE STUDIO • CORE v6.5",
  accentColor: "#007aff",
  passcode: "0000",
  contactEmail: "contact@imagerize.studio",
  showNeuralTools: true
};

const FILTER_SETS = {
  Essential: [
    { name: 'Original', f: 'none' },
    { name: 'Vivid', f: 'saturate(1.5) contrast(1.1) brightness(1.05)' },
    { name: 'Clean', f: 'brightness(1.1) saturate(1.1) contrast(1.05)' },
    { name: 'Deep', f: 'contrast(1.3) saturate(1.2) brightness(0.95)' },
    { name: 'Pure', f: 'brightness(1.15) saturate(0.85)' },
  ],
  Cinematic: [
    { name: 'Blockbuster', f: 'hue-rotate(-10deg) saturate(1.6) contrast(1.2) sepia(0.1)' },
    { name: 'Noir', f: 'grayscale(100%) contrast(1.6) brightness(0.9)' },
    { name: 'Teal', f: 'hue-rotate(140deg) saturate(1.2) contrast(1.1) brightness(0.9)' },
    { name: 'Midnight', f: 'brightness(0.8) contrast(1.3) hue-rotate(180deg) saturate(1.4)' },
  ],
  Vintage: [
    { name: '1970s', f: 'sepia(0.6) saturate(1.4) contrast(0.9) brightness(1.1)' },
    { name: 'Retro', f: 'sepia(0.4) hue-rotate(-20deg) saturate(1.2) contrast(1.1)' },
    { name: 'Antique', f: 'sepia(1) contrast(0.8) brightness(1.1) hue-rotate(-10deg)' },
  ],
  Artistic: [
    { name: 'Cyber', f: 'hue-rotate(280deg) saturate(2.5) contrast(1.3) brightness(0.9)' },
    { name: 'Industrial', f: 'grayscale(0.5) contrast(1.4) brightness(0.9) saturate(0.8)' },
    { name: 'Acid', f: 'invert(0.1) hue-rotate(90deg) saturate(3) contrast(1.5)' },
  ]
};

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('imagerize_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Tool Specific States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [resizeW, setResizeW] = useState('');
  const [resizeH, setResizeH] = useState('');
  const [lockAspect, setLockAspect] = useState(true);
  const [straighten, setStraighten] = useState(0);
  const [grainAmount, setGrainAmount] = useState(0);
  const [pixelScale, setPixelScale] = useState(0.1);
  const [borderSize, setBorderSize] = useState(5);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [filterCategory, setFilterCategory] = useState<keyof typeof FILTER_SETS>('Essential');

  // Lab/Conversion States
  const [labFormat, setLabFormat] = useState('image/jpeg');
  const [labQuality, setLabQuality] = useState(0.9);
  const [qrText, setQrText] = useState('');
  const [qrImage, setQrImage] = useState('');

  const activeProject = projects[activeIndex] || null;

  // Sync Resize Inputs with Active Image
  useEffect(() => {
    if (activeProject) {
      setResizeW(activeProject.metadata.width.toString());
      setResizeH(activeProject.metadata.height.toString());
    }
  }, [activeIndex, activeTool, activeProject?.metadata.width]);

  // Aspect Ratio Locking Logic
  useEffect(() => {
    if (activeProject && lockAspect && resizeW && activeTool === ToolType.RESIZE) {
      const ratio = activeProject.metadata.width / activeProject.metadata.height;
      const newH = Math.round(parseInt(resizeW) / ratio);
      if (!isNaN(newH) && newH.toString() !== resizeH) {
        setResizeH(newH.toString());
      }
    }
  }, [resizeW, lockAspect]);

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

  const handleUpload = async (files: File[]) => {
    startTask('Initializing Assets...');
    const newProjects: ProjectImage[] = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: file.type,
        size: file.size, originalSize: file.size, name: file.name
      };
      return { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta, action: 'Original' }], historyIndex: 0 };
    }));
    setProjects(prev => [...prev, ...newProjects]);
    setActiveIndex(projects.length);
    setView('editor');
    endTask();
  };

  const applyAction = async (task: (img: HTMLImageElement) => Promise<string>, actionName: string) => {
    if (!activeProject) return;
    startTask(`${actionName}...`);
    try {
      const img = await imageService.loadImage(activeProject.url);
      const url = await task(img);
      const finalImg = await imageService.loadImage(url);
      const response = await fetch(url);
      const blob = await response.blob();
      
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      updatedHistory.push({ url, metadata: newMeta, action: actionName });
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
    } catch (e) {
      console.error(e);
      alert("Operation failed. Try again.");
    } finally { endTask(); }
  };

  const undo = () => {
    if (!activeProject || activeProject.historyIndex <= 0) return;
    const newIdx = activeProject.historyIndex - 1;
    const newProjects = [...projects];
    newProjects[activeIndex] = { ...activeProject, url: activeProject.history[newIdx].url, metadata: activeProject.history[newIdx].metadata, historyIndex: newIdx };
    setProjects(newProjects);
  };

  const redo = () => {
    if (!activeProject || activeProject.historyIndex >= activeProject.history.length - 1) return;
    const newIdx = activeProject.historyIndex + 1;
    const newProjects = [...projects];
    newProjects[activeIndex] = { ...activeProject, url: activeProject.history[newIdx].url, metadata: activeProject.history[newIdx].metadata, historyIndex: newIdx };
    setProjects(newProjects);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleNeuralGrade = async () => {
    if (!activeProject) return;
    startTask('Neural Mastering...');
    try {
      const analysisJson = await geminiService.analyzeImage(activeProject.url, activeProject.metadata.format);
      const analysis = JSON.parse(analysisJson);
      setAiReview(analysis.aesthetic_review);
      
      const img = await imageService.loadImage(activeProject.url);
      const { brightness: b, contrast: c, saturation: s } = analysis.adjustments;
      const url = await imageService.applyFilter(img, `brightness(${b}%) contrast(${c}%) saturate(${s}%)`);
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size };
      const newHistory = [...activeProject.history.slice(0, activeProject.historyIndex + 1), { url, metadata: newMeta, action: 'Neural Grade' }];
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, metadata: newMeta, history: newHistory, historyIndex: newHistory.length - 1 };
      setProjects(newProjects);
      setTimeout(() => setAiReview(null), 6000);
    } catch (e) {
      alert("Neural logic failed to connect.");
    } finally { endTask(); }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30">
      
      {/* Dynamic Mesh Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full blur-[180px] opacity-20 animate-pulse" style={{ backgroundColor: settings.accentColor }}></div>
         <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full blur-[180px] opacity-20 animate-pulse" style={{ backgroundColor: '#af52de' }}></div>
      </div>

      {/* Global Loader */}
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 ios-blur animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-8">
            <div className="w-16 h-16 border-4 border-white/5 border-t-white rounded-full animate-spin"></div>
            <p className="font-black text-xs uppercase tracking-[0.5em] text-white/50">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* AI Notification */}
      {aiReview && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-lg animate-in slide-in-from-top-8 duration-500">
          <div className="glass-panel ios-blur rounded-3xl p-6 shadow-2xl border-white/10 flex items-center gap-5">
            <div className="w-12 h-12 bg-[#007aff] rounded-xl flex items-center justify-center flex-shrink-0 animate-bounce">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium italic opacity-90">"{aiReview}"</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/40 ios-blur border-b border-white/5 px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all" onClick={() => setView('home')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.accentColor }}>
            <SparklesIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">{settings.title}</h1>
        </div>
        <div className="flex gap-3">
           {view !== 'home' && (
             <button onClick={() => setView('home')} className="p-2.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-all"><XIcon className="w-5 h-5 text-white/50" /></button>
           )}
           <button onClick={() => setView('settings')} className="p-2.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-all"><SettingsIcon className="w-5 h-5 text-white/50" /></button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8">
        
        {/* Home View */}
        {view === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-16 py-10">
            <div className="relative w-full rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl glass-panel p-10 md:p-20 flex flex-col md:flex-row items-center gap-16">
               <div className="flex-1 space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full ios-blur">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Studio Engine Active</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
                     {settings.heroHeadline}<br/>
                     <span style={{ color: settings.accentColor }}>{settings.heroSubheadline}</span>
                  </h2>
                  <p className="text-white/40 text-lg md:text-xl font-medium max-w-lg leading-relaxed">{settings.heroDescription}</p>
                  <div className="flex flex-wrap gap-4 pt-4">
                     <button onClick={() => setView('editor')} className="px-10 py-5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Launch Studio</button>
                     <button onClick={() => setView('format')} className="px-10 py-5 bg-white/5 border border-white/10 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all">Open Lab</button>
                  </div>
               </div>
               <div className="flex-1 hidden lg:block">
                  <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/5 rotate-3 p-2 relative">
                     <img src="https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover rounded-[2.5rem] grayscale" alt="Preview" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-[2.5rem]"></div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[
                  { view: 'editor', title: 'Studio', desc: 'Neural color grading & manual precision suite.', icon: AdjustmentsIcon, color: settings.accentColor },
                  { view: 'format', title: 'Universal Lab', desc: 'Batch transcoding & format synthesis.', icon: ConvertIcon, color: '#af52de' },
                  { view: 'qr', title: 'Matrix', desc: 'Synthesize data into high-precision matrix logic.', icon: QrCodeIcon, color: '#ff375f' }
               ].map(card => (
                  <div key={card.title} onClick={() => setView(card.view as any)} className="group relative p-10 bg-[#1c1c1e] rounded-[3rem] border border-white/5 cursor-pointer hover:border-white/20 hover:-translate-y-2 transition-all">
                     <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-10 shadow-xl group-hover:scale-110 transition-transform" style={{ backgroundColor: card.color }}>
                        <card.icon className="w-8 h-8 text-white" />
                     </div>
                     <h3 className="text-3xl font-black tracking-tighter mb-2">{card.title}</h3>
                     <p className="text-white/30 font-bold leading-snug">{card.desc}</p>
                  </div>
               ))}
            </div>
          </div>
        )}

        {/* Editor View */}
        {view === 'editor' && (
           <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 pb-32">
             {!activeProject ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-10 py-20">
                    <Uploader onUpload={handleUpload} onUrlUpload={async (url) => {
                       const img = await imageService.loadImage(url);
                       const meta = { width: img.width, height: img.height, format: 'image/png', size: 0, originalSize: 0, name: 'Imported Asset' };
                       setProjects([{ id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta, action: 'Imported' }], historyIndex: 0 }]);
                       setActiveIndex(0);
                    }} />
                    <p className="text-white/20 font-black uppercase text-[10px] tracking-[0.5em]">Import asset to begin</p>
                </div>
             ) : (
                <div className="flex flex-col lg:flex-row gap-8 min-h-[65vh]">
                   {/* Main Preview Area */}
                   <div className="flex-1 flex flex-col gap-6 min-w-0">
                      <div className="relative flex-1 bg-[#0c0c0e] rounded-[3rem] border border-white/5 shadow-inner flex items-center justify-center overflow-hidden group">
                         {/* Control Overlays */}
                         <div className="absolute top-6 left-6 flex gap-3 z-30">
                            <button onClick={undo} disabled={activeProject.historyIndex === 0} className="p-3 bg-black/60 ios-blur border border-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-all"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={redo} disabled={activeProject.historyIndex === activeProject.history.length - 1} className="p-3 bg-black/60 ios-blur border border-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-all"><RedoIcon className="w-5 h-5"/></button>
                         </div>
                         <div className="absolute top-6 right-6 z-30">
                            <button onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)} className="px-5 py-2.5 bg-black/60 ios-blur border border-white/10 rounded-full flex items-center gap-2 active:scale-95 transition-all">
                               <EyeIcon className="w-4 h-4 text-white/50" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Compare</span>
                            </button>
                         </div>

                         {/* Image Rendering */}
                         <div className="relative transition-all duration-500" style={{ transform: `scale(${zoom})` }}>
                            <img src={showOriginal ? activeProject.history[0].url : activeProject.url} className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-2xl transition-opacity" alt="Studio Canvas" />
                         </div>

                         {/* Zoom Controls */}
                         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-black/80 ios-blur border border-white/10 rounded-full p-2 px-8 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setZoom(Math.max(0.1, zoom - 0.2))} className="p-3 hover:bg-white/5 rounded-full"><ZoomOutIcon className="w-6 h-6"/></button>
                            <span className="text-xs font-black tabular-nums">{Math.round(zoom*100)}%</span>
                            <button onClick={() => setZoom(Math.min(5, zoom + 0.2))} className="p-3 hover:bg-white/5 rounded-full"><ZoomInIcon className="w-6 h-6"/></button>
                         </div>
                      </div>

                      {/* Filmstrip / Recent Assets */}
                      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2">
                         {projects.map((p, i) => (
                           <div key={p.id} onClick={() => setActiveIndex(i)} className={`w-20 h-20 rounded-2xl flex-shrink-0 cursor-pointer border-2 transition-all relative overflow-hidden ${activeIndex === i ? 'border-white scale-105 shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                             <img src={p.url} className="w-full h-full object-cover" />
                           </div>
                         ))}
                         <label className="w-20 h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                           <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                           <UploadIcon className="w-6 h-6 opacity-30" />
                         </label>
                      </div>
                   </div>

                   {/* Right Side Inspector Panel */}
                   <div className="w-full lg:w-[400px] flex flex-col gap-6">
                      <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8 flex-1 flex flex-col overflow-hidden relative min-h-[500px]">
                         {activeTool ? (
                            <div className="animate-in slide-in-from-right-4 duration-500 flex flex-col h-full">
                               <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                                  <h3 className="text-2xl font-black uppercase tracking-tighter" style={{ color: settings.accentColor }}>{activeTool}</h3>
                                  <button onClick={() => setActiveTool(null)} className="p-2 bg-white/5 rounded-full"><XIcon className="w-5 h-5 opacity-40" /></button>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto no-scrollbar space-y-10 pb-10">
                                  {activeTool === ToolType.ADJUST && (
                                     <div className="space-y-10 px-1">
                                        {[
                                          {l:'Exposure', v:brightness, s:setBrightness}, 
                                          {l:'Contrast', v:contrast, s:setContrast}, 
                                          {l:'Saturation', v:saturate, s:setSaturate},
                                          {l:'Warmth', v:warmth, s:setWarmth, min: -50, max: 50}
                                        ].map(a => (
                                           <div key={a.l} className="space-y-4">
                                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                                                 <span>{a.l}</span>
                                                 <span className="text-white tabular-nums">{a.v}</span>
                                              </div>
                                              <input type="range" min={a.min || 0} max={a.max || 200} value={a.v} onChange={e => a.s(parseInt(e.target.value))} />
                                           </div>
                                        ))}
                                        <button onClick={() => applyAction((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${warmth}deg)`), 'Grade')} className="w-full py-6 rounded-full bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-[#007aff] hover:text-white transition-all">Commit Adjustment</button>
                                     </div>
                                  )}

                                  {activeTool === ToolType.FILTER && (
                                     <div className="space-y-8">
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                           {Object.keys(FILTER_SETS).map(cat => (
                                              <button key={cat} onClick={() => setFilterCategory(cat as any)} className={`whitespace-nowrap px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/5'}`}>{cat}</button>
                                           ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                           {FILTER_SETS[filterCategory].map(p => (
                                              <button key={p.name} onClick={() => applyAction((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col gap-3 group text-left">
                                                 <div className="aspect-square rounded-2xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all relative">
                                                    <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                                 </div>
                                                 <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white transition-all ml-2">{p.name}</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                  )}

                                  {activeTool === ToolType.CROP && (
                                     <div className="grid grid-cols-1 gap-4">
                                        {[
                                           {n: 'Square', r: '1:1', w: 1, h: 1},
                                           {n: 'Reel/TikTok', r: '9:16', w: 9, h: 16},
                                           {n: 'Portrait', r: '4:5', w: 4, h: 5},
                                           {n: 'HD Landscape', r: '16:9', w: 16, h: 9}
                                        ].map(r => (
                                           <button key={r.r} onClick={() => {
                                              const targetW = activeProject.metadata.width;
                                              const targetH = Math.round((targetW / r.w) * r.h);
                                              applyAction((img) => imageService.cropImage(img, 0, 0, targetW, Math.min(targetH, activeProject.metadata.height)), `Crop ${r.r}`);
                                           }} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all flex justify-between items-center group">
                                              <span className="text-xs font-black uppercase tracking-widest">{r.n}</span>
                                              <span className="text-[10px] font-black text-white/20">{r.r}</span>
                                           </button>
                                        ))}
                                     </div>
                                  )}

                                  {activeTool === ToolType.RESIZE && (
                                     <div className="space-y-10 px-1">
                                        <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                                           <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Lock Ratio</span>
                                           <button onClick={() => setLockAspect(!lockAspect)} className={`w-10 h-6 rounded-full transition-all relative ${lockAspect ? 'bg-[#007aff]' : 'bg-white/10'}`}>
                                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${lockAspect ? 'left-5' : 'left-1'}`}></div>
                                           </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-2">
                                              <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-2">Width</label>
                                              <input type="number" value={resizeW} onChange={e => setResizeW(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-4 text-lg font-black outline-none focus:border-[#007aff] transition-all" />
                                           </div>
                                           <div className="space-y-2">
                                              <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-2">Height</label>
                                              <input type="number" value={resizeH} readOnly={lockAspect} onChange={e => !lockAspect && setResizeH(e.target.value)} className={`w-full bg-black border border-white/5 rounded-xl p-4 text-lg font-black outline-none transition-all ${lockAspect ? 'opacity-30' : 'focus:border-[#007aff]'}`} />
                                           </div>
                                        </div>
                                        <button onClick={() => applyAction((img) => imageService.resizeImage(img, parseInt(resizeW), parseInt(resizeH)), 'Rescale')} className="w-full py-6 rounded-full bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-[#007aff] hover:text-white transition-all">Execute Logic</button>
                                     </div>
                                  )}

                                  {activeTool === ToolType.ROTATE && (
                                     <div className="space-y-10">
                                        <div className="space-y-4">
                                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                                              <span>Straighten</span>
                                              <span className="text-white">{straighten}°</span>
                                           </div>
                                           <input type="range" min="-45" max="45" value={straighten} onChange={e => setStraighten(parseInt(e.target.value))} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                           <button onClick={() => applyAction((img) => imageService.rotateImage(img, -90), '-90')} className="p-8 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center gap-4 hover:bg-white/10">
                                              <RotateIcon className="w-6 h-6 -scale-x-100" />
                                              <span className="text-[9px] font-black uppercase tracking-widest opacity-30">-90°</span>
                                           </button>
                                           <button onClick={() => applyAction((img) => imageService.rotateImage(img, 90), '+90')} className="p-8 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center gap-4 hover:bg-white/10">
                                              <RotateIcon className="w-6 h-6" />
                                              <span className="text-[9px] font-black uppercase tracking-widest opacity-30">+90°</span>
                                           </button>
                                        </div>
                                     </div>
                                  )}

                                  {activeTool === ToolType.INFO && (
                                    <div className="space-y-6">
                                      {[
                                        {l: 'Dimensions', v: `${activeProject.metadata.width} × ${activeProject.metadata.height} PX`},
                                        {l: 'Format', v: activeProject.metadata.format.split('/')[1].toUpperCase()},
                                        {l: 'File Size', v: formatFileSize(activeProject.metadata.size)},
                                        {l: 'Original', v: formatFileSize(activeProject.metadata.originalSize)},
                                        {l: 'Ops History', v: activeProject.historyIndex + 1}
                                      ].map(row => (
                                        <div key={row.l} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-white/10 transition-all">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{row.l}</span>
                                          <span className="text-xs font-black tabular-nums">{row.v}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                               </div>
                            </div>
                         ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-10 opacity-30 animate-pulse">
                               <AdjustmentsIcon className="w-16 h-16" />
                               <p className="text-[10px] font-black uppercase tracking-[0.5em]">Studio Inspector</p>
                            </div>
                         )}
                      </div>
                      
                      {/* Floating Project Metadata Summary */}
                      <div className="bg-[#1c1c1e] p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-2xl group">
                         <div className="min-w-0">
                            <h3 className="text-lg font-black truncate tracking-tighter group-hover:text-[#007aff] transition-colors">{activeProject.metadata.name}</h3>
                            <div className="flex gap-3">
                               <span className="text-[9px] font-black px-3 py-1 bg-white/5 rounded-full text-white/30">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                               <span className="text-[9px] font-black px-3 py-1 bg-[#007aff]/10 rounded-full text-[#007aff]">{formatFileSize(activeProject.metadata.size)}</span>
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={handleNeuralGrade} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 active:scale-95 transition-all text-[#007aff]"><MagicWandIcon className="w-5 h-5"/></button>
                            <a href={activeProject.url} download={`Studio_${activeProject.metadata.name}`} className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#007aff] hover:text-white transition-all">Export</a>
                         </div>
                      </div>
                   </div>
                </div>
             )}
           </div>
        )}

        {/* Lab/Conversion View */}
        {view === 'format' && (
           <div className="py-10 flex flex-col items-center gap-12 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                 <ConvertIcon className="w-16 h-16 mx-auto mb-6" style={{ color: settings.accentColor }} />
                 <h2 className="text-5xl font-black tracking-tighter uppercase">Universal Lab</h2>
                 <p className="text-white/30 font-medium text-lg">Batch Transcode Engine & Asset Optimizer.</p>
              </div>

              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <Uploader onUpload={handleUpload} onUrlUpload={() => {}} />
                 <div className="bg-[#1c1c1e] p-10 rounded-[3.5rem] border border-white/5 space-y-10">
                    <div className="space-y-6">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-4">Batch Logic ( {projects.length} Files )</label>
                       <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                          {projects.map(p => (
                             <img key={p.id} src={p.url} className="w-16 h-16 rounded-xl object-cover border border-white/5" />
                          ))}
                          {projects.length === 0 && <div className="w-full py-10 text-center text-white/10 italic">Empty Queue</div>}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-4">Output Matrix</label>
                       <div className="grid grid-cols-3 gap-3">
                          {['image/jpeg', 'image/png', 'image/webp'].map(f => (
                             <button key={f} onClick={() => setLabFormat(f)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${labFormat === f ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/5'}`}>{f.split('/')[1]}</button>
                          ))}
                       </div>
                    </div>
                    <button disabled={projects.length === 0} className="w-full py-6 rounded-full bg-[#af52de] text-white font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20">Synthesize Batch</button>
                 </div>
              </div>
           </div>
        )}

        {/* Matrix View (QR) */}
        {view === 'qr' && (
           <div className="py-20 flex flex-col items-center gap-12 animate-in zoom-in-95 duration-500 max-w-2xl mx-auto">
              <QrCodeIcon className="w-20 h-20" style={{ color: '#ff375f' }} />
              <h2 className="text-5xl font-black tracking-tighter uppercase">Matrix Engine</h2>
              <div className="w-full bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/5 space-y-8">
                 <input type="text" value={qrText} onChange={e => setQrText(e.target.value)} placeholder="Input logic source..." className="w-full bg-black border border-white/5 rounded-2xl p-6 text-xl font-black outline-none focus:border-[#ff375f] transition-all text-center" />
                 <button onClick={() => setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrText)}`)} className="w-full py-6 rounded-full bg-white text-black font-black uppercase tracking-widest hover:bg-[#ff375f] hover:text-white transition-all">Generate Matrix</button>
              </div>
              {qrImage && (
                 <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-6">
                    <img src={qrImage} className="w-64 h-64 rounded-3xl border-8 border-white shadow-2xl" alt="QR" />
                    <a href={qrImage} download="Studio_Matrix.png" className="px-12 py-4 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10">Download Logic</a>
                 </div>
              )}
           </div>
        )}

      </main>

      {/* Editor Footer Suite */}
      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
      
      {/* Footer Branding */}
      <footer className="w-full py-32 px-10 border-t border-white/5 bg-black mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <SparklesIcon className="w-8 h-8" style={{ color: settings.accentColor }} />
                <h4 className="text-4xl font-black uppercase tracking-tighter">{settings.title}</h4>
             </div>
             <p className="text-white/20 font-bold max-w-sm">{settings.heroDescription}</p>
          </div>
          <div className="flex items-center gap-8 bg-white/5 p-8 rounded-[3rem] border border-white/5 group hover:bg-white/10 transition-all cursor-pointer">
             <div className="text-right">
                <span className="block text-3xl font-black tracking-tighter">{settings.programmerName}</span>
                <span className="block text-[10px] font-black uppercase tracking-widest text-white/20">{settings.programmerRole}</span>
             </div>
             <img src={settings.programmerImage} className="w-20 h-20 rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" alt="Avatar" />
          </div>
        </div>
      </footer>
    </div>
  );
}
