
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem, ViewType, SiteSettings, AppLog } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon,
  GripVerticalIcon, ConvertIcon, SettingsIcon, ChevronRightIcon, BWIcon, BorderIcon, QrCodeIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';
import * as geminiService from './services/geminiService.ts';

const DEFAULT_SETTINGS: SiteSettings = {
  title: "Imagerize",
  heroHeadline: "Precision Suite.",
  heroSubheadline: "Creative Logic.",
  heroDescription: "The ultimate pro workspace for high-fidelity image mastering, neural grading, and precision formatting.",
  programmerName: "Sujon Roy",
  programmerRole: "Founder & Studio Head",
  programmerUrl: "https://facebook.com/sujonworld0",
  programmerImage: "https://graph.facebook.com/sujonworld0/picture?type=large",
  footerCopyright: "© 2024 IMAGERIZE STUDIO • CORE v5.2",
  accentColor: "#007aff",
  passcode: "0000",
  contactEmail: "contact@imagerize.studio",
  showNeuralTools: true
};

const lookPresets = {
  Modern: [
    { name: 'Vivid', f: 'saturate(1.4) contrast(1.1) brightness(1.05)' },
    { name: 'Dramatic', f: 'contrast(1.4) brightness(0.9) saturate(0.8)' },
    { name: 'Mono', f: 'grayscale(100%) contrast(1.2) brightness(1.1)' },
    { name: 'Clean', f: 'brightness(1.05) saturate(1.1)' },
    { name: 'Pure', f: 'brightness(1.1) contrast(1.05) saturate(0.9)' }
  ],
  Studio: [
    { name: 'Portrait', f: 'brightness(1.05) contrast(1.05) saturate(1.1)' },
    { name: 'Commercial', f: 'contrast(1.2) saturate(1.3)' },
    { name: 'Fashion', f: 'brightness(1.1) contrast(1.1) saturate(0.9) sepia(0.05)' },
    { name: 'Product', f: 'brightness(1.02) contrast(1.1) saturate(1.2)' },
    { name: 'High Key', f: 'brightness(1.3) contrast(0.9) saturate(1.1)' }
  ]
};

const HeroVisual = ({ accentColor }: { accentColor: string }) => {
  const [step, setStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 4), 6000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };
  
  const getStyle = (s: number) => {
    const isMain = s === step;
    const parallaxX = mousePos.x * 40;
    const parallaxY = mousePos.y * 40;
    
    switch(s) {
      case 1: return { filter: 'brightness(1.1) saturate(1.4) contrast(1.1)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1.1) rotate(2deg)' };
      case 2: return { filter: 'grayscale(100%) contrast(1.25)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(0.95) rotate(-2deg)' };
      case 3: return { filter: 'sepia(0.2) contrast(1.1) brightness(1.05)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1.05) rotate(1deg)' };
      default: return { filter: 'none', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1)' };
    }
  };

  const labels = ["RAW FIDELITY", "NEURAL POLISH", "MONO PRECISION", "CLASSIC FILM"];

  return (
    <div 
      className="relative w-full max-w-6xl mx-auto aspect-[2.4/1] mb-12 px-4 group cursor-default perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
    >
      <div className="relative h-full w-full bg-[#0a0a0c]/40 ios-blur rounded-[4rem] p-4 border border-white/5 shadow-[0_60px_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center transition-all duration-1000 group-hover:border-white/10">
        <div className="absolute top-12 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <div className="bg-black/90 ios-blur px-12 py-4 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-[0.8em] shadow-2xl transition-all duration-700 group-hover:tracking-[1em]" style={{ color: accentColor }}>
            {labels[step]}
          </div>
        </div>

        {[0, 1, 2, 3].map((s) => (
           <img 
            key={s}
            src="https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1600&auto=format&fit=crop" 
            className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] object-cover rounded-[3.5rem] transition-all duration-[2500ms] cubic-bezier(0.19, 1, 0.22, 1)" 
            style={getStyle(s)} 
          />
        ))}
        
        <div className="absolute bottom-20 left-32 w-24 h-24 bg-white/5 ios-blur rounded-3xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{ transform: `translate(${mousePos.x * -80}px, ${mousePos.y * -80}px)` }}><AdjustmentsIcon className="w-12 h-12" style={{ color: accentColor }} /></div>
        <div className="absolute top-32 right-32 w-20 h-20 bg-white/5 ios-blur rounded-[2rem] border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{animationDelay: '2.5s', transform: `translate(${mousePos.x * -50}px, ${mousePos.y * -50}px)` }}><CropIcon className="w-10 h-10 text-[#af52de]" /></div>
        <div className="absolute bottom-40 right-48 w-14 h-14 bg-white/5 ios-blur rounded-2xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{animationDelay: '1.2s', transform: `translate(${mousePos.x * -110}px, ${mousePos.y * -110}px)` }}><SparklesIcon className="w-7 h-7 text-white/50" /></div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none z-10 opacity-30"></div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('imagerize_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch(e) { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });
  const [logs, setLogs] = useState<AppLog[]>(() => {
    const savedLogs = localStorage.getItem('imagerize_logs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);

  // Fix: Added missing adjustment states to resolve "Cannot find name" errors
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  // Fix: Defined activeProject to ensure it's accessible throughout the component and JSX
  const activeProject = projects[activeIndex];
  
  // QR State
  const [qrText, setQrText] = useState('');
  const [qrImage, setQrImage] = useState('');

  const recordLog = (log: Omit<AppLog, 'id' | 'timestamp' | 'browser' | 'os' | 'screenSize' | 'deviceType'>) => {
    const ua = navigator.userAgent;
    const newLog: AppLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      browser: ua.includes("Chrome") ? "Chrome" : "Engine",
      os: "Auto",
      screenSize: `${window.screen.width}x${window.screen.height}`,
      deviceType: "Desktop"
    };
    setLogs(prev => {
      const next = [newLog, ...prev].slice(0, 100); 
      localStorage.setItem('imagerize_logs', JSON.stringify(next));
      return next;
    });
  };

  const analyticsStats = useMemo(() => ({
    totalUploads: logs.filter(l => l.type === 'upload').length,
    totalInteractions: logs.filter(l => l.type === 'click').length,
    secureVisits: logs.filter(l => l.type === 'visit' || l.type === 'security').length,
  }), [logs]);

  const clearLogs = () => {
    if (confirm("Purge system telemetry?")) {
      setLogs([]);
      localStorage.removeItem('imagerize_logs');
    }
  };

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

  const handleUpload = async (files: File[]) => {
    startTask('Initializing Suite...');
    const newProjects: ProjectImage[] = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: file.type,
        size: file.size, originalSize: file.size, name: file.name
      };
      recordLog({ type: 'upload', details: `Import: ${file.name}`, thumbnail: url });
      return { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 };
    }));
    setProjects(prev => [...prev, ...newProjects]);
    setActiveIndex(projects.length);
    setView('editor');
    endTask();
  };

  const applyTool = async (task: (img: HTMLImageElement) => Promise<string>, actionName: string) => {
    if (!activeProject) return;
    startTask(`${actionName}...`);
    try {
      const img = await imageService.loadImage(activeProject.url);
      const url = await task(img);
      const finalImg = await imageService.loadImage(url);
      const response = await fetch(url);
      const blob = await response.blob();
      
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      updatedHistory.push({ url, metadata: newMeta, action: actionName });
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
      setActiveTool(null);
      recordLog({ type: 'click', details: `Orchestrated: ${actionName}` });
    } catch (e) { alert("Processing failed."); } finally { endTask(); }
  };

  const handleAutoEnhance = async () => {
    if (!activeProject) return;
    startTask('Neural Deep Scan...');
    try {
      const img = await imageService.loadImage(activeProject.url);
      // Fetch analysis from Gemini
      const analysisJson = await geminiService.analyzeImage(activeProject.url, activeProject.metadata.format);
      const analysis = JSON.parse(analysisJson);
      
      const { brightness: b, contrast: c, saturation: s } = analysis.adjustments;
      const filterStr = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
      
      const enhancedUrl = await imageService.applyFilter(img, filterStr);
      const finalImg = await imageService.loadImage(enhancedUrl);
      const blob = await (await fetch(enhancedUrl)).blob();
      
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      updatedHistory.push({ url: enhancedUrl, metadata: newMeta, action: 'Neural Polish' });
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url: enhancedUrl, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
      recordLog({ type: 'click', details: `AI Auto-Enhanced Asset` });
    } catch (e) {
      console.error(e);
      // Fallback simple enhance if AI fails
      const img = await imageService.loadImage(activeProject.url);
      const url = await imageService.applyFilter(img, 'brightness(1.08) contrast(1.1) saturate(1.15)');
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      updatedHistory.push({ url, metadata: newMeta, action: 'Auto Enhance (Base)' });
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
    } finally { endTask(); }
  };

  const handleGenerateQR = () => {
    if (!qrText) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrText)}`;
    setQrImage(url);
    recordLog({ type: 'click', details: `Generated QR for: ${qrText.slice(0, 20)}` });
  };

  const importQRToStudio = async () => {
    startTask('Capturing QR Matrix...');
    try {
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: blob.type,
        size: blob.size, originalSize: blob.size, name: `QR_Code_${Date.now()}.png`
      };
      const newProject: ProjectImage = { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 };
      setProjects(prev => [...prev, newProject]);
      setActiveIndex(projects.length);
      setView('editor');
      setQrImage('');
      setQrText('');
    } catch(e) { alert("Import failed."); } finally { endTask(); }
  };

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30 overflow-x-hidden">
      
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: settings.accentColor }}></div>
         <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: '#af52de', animationDelay: '2s' }}></div>
      </div>

      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl"></div>
          <div className="relative bg-[#1c1c1e]/90 ios-blur p-20 rounded-[5rem] flex flex-col items-center gap-12 border border-white/10 shadow-[0_0_150px_rgba(0,122,255,0.15)] spring-in">
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 border-[8px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[8px] border-t-transparent rounded-full animate-spin" style={{ borderColor: settings.accentColor, borderTopColor: 'transparent' }}></div>
            </div>
            <p className="font-black text-3xl tracking-[0.4em] uppercase text-center min-w-[360px] leading-tight" style={{ color: settings.accentColor }}>
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/40 ios-blur border-b border-white/5 px-8 md:px-16 py-6 flex items-center justify-between transition-all duration-500">
        <div className="flex items-center gap-5 cursor-pointer group" onClick={() => {setView('home'); setActiveTool(null);}}>
          <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-[0_15px_40px_-5px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" style={{ backgroundColor: settings.accentColor }}>
            <SparklesIcon className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter hidden sm:block uppercase">{settings.title}</h1>
        </div>
        
        <div className="flex items-center gap-6 spring-in">
          {view !== 'home' && (
            <div className="flex items-center bg-white/[0.03] rounded-full p-2 border border-white/10 shadow-inner">
               <button onClick={() => { setView('home'); setActiveTool(null); }} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white/30 transition-all"><XIcon className="w-6 h-6" /></button>
            </div>
          )}
          <button onClick={() => setView('settings')} className="p-4 bg-white/5 rounded-full hover:bg-white/10 border border-white/5 shadow-xl transition-all"><SettingsIcon className="w-6 h-6 text-white/30" /></button>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-12 transition-all duration-1000 overflow-hidden">
        
        {view === 'home' && (
          <div className="py-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <HeroVisual accentColor={settings.accentColor} />
            
            <div className="text-center space-y-10 mb-40 px-6 relative">
              <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent to-white/10"></div>
              <h2 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.8] max-w-6xl mx-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                {settings.heroHeadline} <br/>
                <span className="bg-gradient-to-r from-white via-white/80 to-white/30 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${settings.accentColor}, #af52de, #ff375f)` }}>{settings.heroSubheadline}</span>
              </h2>
              <p className="text-white/40 text-2xl md:text-3xl font-medium max-w-3xl mx-auto leading-relaxed">
                {settings.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-12">
                 <button onClick={() => setView('editor')} className="px-16 py-7 rounded-full text-black font-black uppercase text-xs tracking-[0.4em] shadow-[0_30px_70px_rgba(255,255,255,0.2)] hover:scale-105 transition-all bg-white">Start Mastering</button>
                 <button onClick={() => setView('format')} className="px-12 py-7 rounded-full text-white font-black uppercase text-xs tracking-[0.4em] border border-white/15 hover:bg-white/5 transition-all">Format Logic</button>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-10 px-6 mb-48">
              
              {/* QR Tool Bento */}
              <div 
                className="col-span-1 md:col-span-4 group relative p-12 bg-[#0e0e10] rounded-[5rem] border border-white/5 shadow-3xl overflow-hidden flex flex-col min-h-[500px]"
              >
                 <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10" style={{ color: settings.accentColor }}>
                    <QrCodeIcon className="w-10 h-10" />
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter mb-4">QR Generator</h3>
                 <p className="text-white/20 font-bold mb-8">Create high-res QR codes for any text or URL instantly.</p>
                 
                 <div className="space-y-4 mt-auto">
                    <input 
                      type="text" 
                      placeholder="Enter data..." 
                      value={qrText}
                      onChange={e => setQrText(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-sm font-bold outline-none focus:border-white/20 transition-all" 
                    />
                    <button 
                      onClick={handleGenerateQR}
                      className="w-full py-5 rounded-3xl text-black font-black uppercase text-[10px] tracking-[0.3em] bg-white hover:bg-white/90 transition-all"
                    >Generate</button>
                 </div>

                 {qrImage && (
                    <div className="absolute inset-0 bg-[#0e0e10] p-10 flex flex-col items-center justify-center animate-in fade-in duration-500 z-20">
                       <img src={qrImage} className="w-full aspect-square rounded-3xl mb-8 shadow-4xl" alt="QR" />
                       <div className="flex gap-4 w-full">
                          <button onClick={() => setQrImage('')} className="flex-1 py-4 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Cancel</button>
                          <button onClick={importQRToStudio} className="flex-1 py-4 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl" style={{ backgroundColor: settings.accentColor }}>Import</button>
                       </div>
                    </div>
                 )}
              </div>

              {/* Editor Bento */}
              <div 
                className="col-span-1 md:col-span-8 group relative p-16 bg-[#0e0e10] rounded-[5rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all duration-1000 flex flex-col justify-end overflow-hidden min-h-[500px]"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" style={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${settings.accentColor}15, transparent)` }}></div>
                <div className="absolute top-20 left-20 w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-4xl group-hover:rotate-6 transition-transform duration-1000" style={{ backgroundColor: settings.accentColor }}>
                  <AdjustmentsIcon className="w-14 h-14 text-white" />
                </div>
                <div className="z-10">
                  <div className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 mb-5 px-1">Engine vCore 5.2</div>
                  <h3 className="text-6xl font-black tracking-tighter mb-8 leading-[0.9]">Studio Master</h3>
                  <p className="text-white/30 font-bold mb-14 leading-relaxed max-w-lg text-2xl">Manual workflow for high-fidelity grade and pixel-perfect orchestration.</p>
                  <div className="inline-flex bg-white text-black px-14 py-6 rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl group-hover:text-white transition-all" onMouseEnter={(e) => (e.target as any).style.backgroundColor = settings.accentColor} onMouseLeave={(e) => (e.target as any).style.backgroundColor = 'white'}>Launch Studio</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {view === 'editor' && activeProject && (
          <div className="h-full flex flex-col lg:flex-row gap-10 animate-in fade-in duration-1000 relative z-10">
            <div className={`flex-1 flex flex-col gap-8 transition-all duration-700 ${activeTool ? 'lg:scale-[0.98]' : 'scale-100'}`}>
              
              {/* Image Preview Area */}
              <div className="relative flex-1 bg-[#0c0c0e]/90 ios-blur rounded-[5rem] border border-white/5 shadow-4xl overflow-hidden group transition-all duration-1000">
                  
                  {/* AUTO ENHANCE OVERLAY BUTTON */}
                  <div className="absolute top-10 right-10 z-30 pointer-events-auto">
                     <button 
                        onClick={handleAutoEnhance}
                        title="AI Auto-Enhance"
                        className="w-16 h-16 bg-white/10 hover:bg-white/20 ios-blur border border-white/10 rounded-full flex items-center justify-center transition-all shadow-4xl group/magic active:scale-90"
                     >
                        <MagicWandIcon className="w-8 h-8 text-white group-hover/magic:scale-125 transition-transform" style={{ color: settings.accentColor }} />
                        <div className="absolute -top-12 opacity-0 group-hover/magic:opacity-100 transition-opacity bg-black/80 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border border-white/10">Neural Polish</div>
                     </button>
                  </div>

                  <div 
                    className={`relative w-full h-full min-h-[600px] flex items-center justify-center overflow-hidden ${isPanning ? 'bg-black/50 cursor-grabbing scale-[1.03]' : 'bg-transparent cursor-grab scale-100'}`}
                    onMouseDown={(e) => {
                       if (activeTool === ToolType.CROP) return;
                       e.preventDefault();
                       setIsPanning(true);
                       dragStartPos.current = { x: e.clientX, y: e.clientY };
                       panStartOffset.current = { x: panOffset.x, y: panOffset.y };
                    }}
                    onMouseMove={(e) => {
                       if (!isPanning) return;
                       const dx = e.clientX - dragStartPos.current.x;
                       const dy = e.clientY - dragStartPos.current.y;
                       setPanOffset({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy });
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                  >
                    <div className="relative will-change-transform transition-transform duration-700" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }}>
                        <img 
                          src={activeProject.url} 
                          className="max-w-[85vw] max-h-[75vh] object-contain shadow-4xl rounded-[2rem] pointer-events-none" 
                        />
                    </div>
                    
                    {/* Zoom Control */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/90 ios-blur border border-white/10 rounded-full p-3 px-10 shadow-4xl opacity-0 group-hover:opacity-100 transition-all translate-y-6 group-hover:translate-y-0">
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-5 hover:bg-white/10 rounded-full"><ZoomOutIcon className="w-7 h-7 text-white/60" /></button>
                        <span className="text-xl font-black w-20 text-center tabular-nums">{Math.round(zoom*100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(6, z + 0.2))} className="p-5 hover:bg-white/10 rounded-full"><ZoomInIcon className="w-7 h-7 text-white/60" /></button>
                    </div>
                  </div>
              </div>

              {/* Thumbnails */}
              <div className="flex items-center gap-6 overflow-x-auto pb-8 no-scrollbar px-2">
                 <button onClick={() => {setView('home'); setActiveTool(null);}} className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 shadow-3xl"><XIcon className="w-8 h-8 opacity-40"/></button>
                 {projects.map((proj, idx) => (
                     <div 
                       key={proj.id} 
                       onClick={() => { setActiveIndex(idx); setActiveTool(null); }}
                       className={`group relative w-24 h-24 rounded-[3rem] flex-shrink-0 border-[5px] transition-all duration-700 cursor-pointer overflow-visible ${
                           activeIndex === idx ? 'scale-110 shadow-4xl z-20' : 'border-transparent opacity-40 hover:opacity-100 z-10'
                       }`}
                       style={{ borderColor: activeIndex === idx ? settings.accentColor : 'transparent' }}
                     >
                     <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                         <img src={proj.url} className="w-full h-full object-cover transition-transform duration-1000" />
                     </div>
                     </div>
                 ))}
                 <label className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer active:scale-95 group shadow-3xl">
                     <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                     <UploadIcon className="w-8 h-8 opacity-40 group-hover:opacity-100" />
                 </label>
              </div>

            </div>

            {/* Side Control Panel */}
            <div className={`w-full lg:w-[460px] flex flex-col gap-8 transition-all duration-700 ${activeTool ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none hidden lg:flex'}`}>
                <div className="bg-[#111113] p-12 rounded-[5rem] border border-white/5 shadow-4xl space-y-12 max-h-[85vh] overflow-y-auto no-scrollbar">
                    {activeTool ? (
                      <div className="animate-in slide-in-from-right-12 duration-1000 flex flex-col gap-12">
                         <div className="flex items-center justify-between">
                            <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: settings.accentColor }}>{activeTool}</h3>
                            <button onClick={() => setActiveTool(null)} className="p-5 hover:bg-white/5 rounded-full"><XIcon className="w-7 h-7 text-white/30" /></button>
                         </div>
                         
                         {activeTool === ToolType.ADJUST && (
                            <div className="space-y-14">
                               <button 
                                  onClick={handleAutoEnhance}
                                  className="w-full py-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center gap-4 group hover:bg-white/10 transition-all"
                               >
                                  <MagicWandIcon className="w-6 h-6" style={{ color: settings.accentColor }} />
                                  <span className="text-[12px] font-black uppercase tracking-[0.3em]">AI Auto Polish</span>
                               </button>
                               {[{l:'Exposure', v:brightness, s:setBrightness}, {l:'Contrast', v:contrast, s:setContrast}, {l:'Saturate', v:saturate, s:setSaturate}].map(a => (
                                  <div key={a.l} className="space-y-7">
                                     <div className="flex justify-between text-[12px] font-black uppercase tracking-[0.4em] text-white/30">
                                        <span>{a.l}</span>
                                        <span className="text-white tabular-nums">{a.v}%</span>
                                     </div>
                                     <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                                  </div>
                               ))}
                               <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Precision Grade')} className="w-full py-8 rounded-[2.5rem] text-white font-black uppercase text-[12px] tracking-[0.4em] shadow-4xl" style={{ backgroundColor: settings.accentColor }}>Apply Master</button>
                            </div>
                         )}
                         {/* Other tool UIs like Crop, Filter etc go here... */}
                      </div>
                    ) : (
                      <div className="h-[460px] flex flex-col items-center justify-center text-center gap-10">
                          <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-4xl">
                              <SparklesIcon className="w-12 h-12 text-white/10" />
                          </div>
                          <div className="space-y-4">
                             <h4 className="font-black uppercase tracking-[0.5em] text-[13px] text-white/40">Studio Session</h4>
                             <p className="text-white/20 text-lg font-medium px-20">Select an engine from the toolbar to orchestrate your assets.</p>
                          </div>
                      </div>
                    )}
                </div>
                
                {/* File Footer */}
                <div className="bg-[#111113] p-12 rounded-[5rem] border border-white/5 shadow-4xl flex items-center justify-between">
                   <div className="min-w-0">
                      <h3 className="text-3xl font-black truncate mb-3">{activeProject.metadata.name}</h3>
                      <div className="flex gap-4">
                         <span className="text-[11px] font-black px-4 py-2 bg-white/5 rounded-full text-white/30">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                         <span className="text-[11px] font-black px-4 py-2 rounded-full shadow-2xl" style={{ color: settings.accentColor, backgroundColor: `${settings.accentColor}10` }}>{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                   </div>
                   <a href={activeProject.url} download={`studio_${activeProject.metadata.name}`} className="bg-white text-black px-14 py-7 rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-4xl transition-all hover:scale-105 active:scale-95">Export</a>
                </div>
            </div>

          </div>
        )}

        {/* ... (Other views like settings, format, etc remain similar) ... */}

      </main>

      <footer className="w-full py-40 px-12 border-t border-white/5 bg-black relative mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start justify-between gap-32">
          <div className="flex flex-col items-start gap-10 max-w-md">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-4xl" style={{ backgroundColor: settings.accentColor }}><SparklesIcon className="text-white w-7 h-7" /></div>
                <h4 className="text-4xl font-black tracking-tighter uppercase">{settings.title}</h4>
             </div>
             <p className="text-white/20 font-medium leading-relaxed text-xl">High-fidelity asset orchestration for the modern digital studio. Engineered for precision, designed for inspiration.</p>
          </div>
          <div className="flex items-center gap-8">
             <div className="text-right">
                <span className="block text-4xl font-black tracking-tighter">{settings.programmerName}</span>
                <span className="block text-[12px] font-black uppercase tracking-[0.3em] text-white/20 mt-2">{settings.programmerRole}</span>
             </div>
             <div className="w-20 h-20 rounded-[2.2rem] border border-white/10 overflow-hidden shadow-4xl"><img src={settings.programmerImage} className="w-full h-full object-cover" /></div>
          </div>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}
