
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem, ViewType, SiteSettings, AppLog } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon,
  GripVerticalIcon, ConvertIcon, SettingsIcon, ChevronRightIcon, BWIcon, BorderIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';

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
  ],
  Vintage: [
    { name: 'Sepia', f: 'sepia(100%) brightness(0.9) contrast(1.1)' },
    { name: '70s Film', f: 'sepia(0.3) saturate(1.2) contrast(1.1) brightness(1.05) hue-rotate(-10deg)' },
    { name: 'Noir', f: 'grayscale(100%) contrast(1.5) brightness(0.8)' },
    { name: 'Antique', f: 'sepia(0.6) contrast(0.9) brightness(1.1)' },
    { name: 'Grainy', f: 'contrast(1.2) brightness(0.9) saturate(0.5)' }
  ],
  Cinematic: [
    { name: 'Blockbuster', f: 'hue-rotate(-10deg) saturate(1.5) contrast(1.2)' },
    { name: 'Indie', f: 'sepia(0.2) saturate(0.8) contrast(0.9) brightness(1.1)' },
    { name: 'Documentary', f: 'saturate(1.1) contrast(1.1) brightness(1.0)' },
    { name: 'Thriller', f: 'hue-rotate(180deg) saturate(0.5) contrast(1.4) brightness(0.8)' },
    { name: 'Romance', f: 'saturate(1.4) brightness(1.1) sepia(0.1) blur(0.2px)' },
    { name: 'Western', f: 'sepia(0.5) contrast(1.3) saturate(1.2) brightness(0.9)' }
  ],
  Artistic: [
    { name: 'Cyber', f: 'hue-rotate(180deg) saturate(2) contrast(1.2)' },
    { name: 'Ethereal', f: 'brightness(1.2) saturate(0.5) blur(0.5px) contrast(0.9)' },
    { name: 'Acid', f: 'hue-rotate(90deg) saturate(3) invert(0.1)' },
    { name: 'Velvet', f: 'saturate(1.5) contrast(1.3) hue-rotate(-20deg)' },
    { name: 'Dream', f: 'brightness(1.1) saturate(0.7) blur(1px)' }
  ],
  Glitch: [
    { name: 'Shift', f: 'hue-rotate(240deg) saturate(1.5) contrast(1.5)' },
    { name: 'Invert', f: 'invert(100%)' },
    { name: 'Contrast', f: 'contrast(3) saturate(0)' },
    { name: 'Neon', f: 'hue-rotate(300deg) saturate(2) brightness(1.2)' },
    { name: 'Ghost', f: 'opacity(0.6) brightness(1.5) contrast(1.2) grayscale(100%)' },
    { name: 'Static', f: 'contrast(5) grayscale(100%) brightness(0.8)' }
  ],
  Cartoon: [
    { name: 'Poster', f: 'contrast(2) saturate(2) brightness(1.1)' },
    { name: 'Outline', f: 'grayscale(100%) contrast(5) invert(100%)' },
    { name: 'Vibrant', f: 'saturate(3) contrast(1.1)' },
    { name: 'Muted', f: 'saturate(0.4) contrast(1.4) brightness(1.2)' },
    { name: 'Pop', f: 'saturate(4) contrast(1.2) brightness(1.05)' },
    { name: 'Sticker', f: 'saturate(2.5) brightness(1.3) contrast(0.9)' }
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
        
        {/* Interactive Floating Layers */}
        <div className="absolute bottom-20 left-32 w-24 h-24 bg-white/5 ios-blur rounded-3xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{ transform: `translate(${mousePos.x * -80}px, ${mousePos.y * -80}px)` }}><AdjustmentsIcon className="w-12 h-12" style={{ color: accentColor }} /></div>
        <div className="absolute top-32 right-32 w-20 h-20 bg-white/5 ios-blur rounded-[2rem] border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{animationDelay: '2.5s', transform: `translate(${mousePos.x * -50}px, ${mousePos.y * -50}px)` }}><CropIcon className="w-10 h-10 text-[#af52de]" /></div>
        <div className="absolute bottom-40 right-48 w-14 h-14 bg-white/5 ios-blur rounded-2xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{animationDelay: '1.2s', transform: `translate(${mousePos.x * -110}px, ${mousePos.y * -110}px)` }}><SparklesIcon className="w-7 h-7 text-white/50" /></div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none z-10 opacity-30"></div>
      </div>
    </div>
  );
};

const ActivityMap = ({ logs, accentColor }: { logs: AppLog[], accentColor: string }) => {
  return (
    <div className="relative w-full aspect-[2/1] bg-[#0c0c0e]/90 ios-blur rounded-[3.5rem] overflow-hidden border border-white/5 group shadow-2xl">
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }}></div>
      <svg className="w-full h-full opacity-20" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 200Q200 100 400 200T700 200" stroke="white" strokeWidth="0.5" strokeDasharray="8 8" />
        <path d="M50 300Q300 400 500 200T750 100" stroke="white" strokeWidth="0.5" strokeDasharray="8 8" />
        <circle cx="150" cy="180" r="3" fill="white" className="animate-pulse" />
        <circle cx="500" cy="220" r="3" fill="white" className="animate-pulse" style={{animationDelay: '0.7s'}} />
        <circle cx="650" cy="130" r="3" fill="white" className="animate-pulse" style={{animationDelay: '1.4s'}} />
      </svg>
      <div className="absolute inset-0 p-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
           <div className="space-y-1">
              <h5 className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20">Studio Network</h5>
              <p className="text-3xl font-black tracking-tighter">Global Signal</p>
           </div>
           <div className="flex items-center gap-4 px-5 py-2.5 bg-green-500/5 border border-green-500/20 rounded-full shadow-lg">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[11px] font-black text-green-500 uppercase tracking-[0.2em]">Telemetry Active</span>
           </div>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
           {logs.slice(0, 5).map((log, i) => (
             <div key={log.id} className="min-w-[180px] p-5 bg-black/60 ios-blur border border-white/10 rounded-[2rem] animate-in slide-in-from-right-8 shadow-2xl" style={{animationDelay: `${i*150}ms`}}>
                <p className="text-[10px] font-black uppercase text-white/20 mb-2 tracking-widest">{log.location?.split(',')[0] || 'Studio-Local'}</p>
                <p className="text-[13px] font-bold truncate text-white/90">{log.details}</p>
             </div>
           ))}
        </div>
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

  const recordLog = (log: Omit<AppLog, 'id' | 'timestamp' | 'browser' | 'os' | 'screenSize' | 'deviceType'>) => {
    const ua = navigator.userAgent;
    const getOS = () => {
        if (ua.indexOf("Win") !== -1) return "Windows";
        if (ua.indexOf("Mac") !== -1) return "macOS";
        if (ua.indexOf("Android") !== -1) return "Android";
        if (ua.indexOf("like Mac") !== -1) return "iOS";
        return "Unknown OS";
    };

    const newLog: AppLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      browser: ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Engine",
      os: getOS(),
      screenSize: `${window.screen.width}x${window.screen.height}`,
      deviceType: /Mobile|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop"
    };

    setLogs(prev => {
      const next = [newLog, ...prev].slice(0, 200); 
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
    if (confirm("Purge system telemetry? All session data will be permanently erased.")) {
      setLogs([]);
      localStorage.removeItem('imagerize_logs');
      recordLog({ type: 'security', details: 'Telemetry Purged' });
    }
  };

  useEffect(() => {
    const initTelemetry = async () => {
      let location = "Global Gateway";
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { console.warn("Privacy check: masked"); }
      recordLog({ type: 'visit', details: 'Secure Session Initiated', location });
    };
    initTelemetry();

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Fixed: Casting to HTMLElement for TypeScript properties
      const clickable = target && typeof target.closest === 'function' ? (target.closest('button, a') as HTMLElement | null) : null;
      if (clickable) {
        const label = clickable.innerText.trim().slice(0, 30) || clickable.title || 'Control Trigger';
        recordLog({ type: 'click', details: `Interaction: ${label}` });
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    localStorage.setItem('imagerize_settings', JSON.stringify(settings));
    document.title = `${settings.title} | Studio Suite`;
  }, [settings]);

  // Editor Interaction State
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Advanced Tool States
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pixelScale, setPixelScale] = useState(0.1);
  const [compressQuality, setCompressQuality] = useState(0.8);
  const [lookCategory, setLookCategory] = useState<'Modern' | 'Studio' | 'Vintage' | 'Cinematic' | 'Artistic' | 'Glitch' | 'Cartoon'>('Modern');

  const activeProject = projects[activeIndex] || null;

  const handlePasscodeChange = (num: string) => {
    if (passcodeAttempt.length < 4) {
      const next = passcodeAttempt + num;
      setPasscodeAttempt(next);
      if (next === settings.passcode) {
        setTimeout(() => {
          setIsAuthorized(true);
          setPasscodeAttempt('');
          recordLog({ type: 'security', details: 'Vault Authorization Granted' });
        }, 300);
      } else if (next.length === 4) {
        setTimeout(() => {
            setPasscodeAttempt('');
            const el = document.getElementById('passcode-container');
            el?.classList.add('animate-shake');
            setTimeout(() => el?.classList.remove('animate-shake'), 400);
            recordLog({ type: 'security', details: 'Vault Auth Failure' });
        }, 300);
      }
    }
  };

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

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
    } catch (e) { 
      console.error(e); 
      alert("Asset processing failed.");
    } finally { endTask(); }
  };

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30 overflow-x-hidden">
      
      {/* Premium Mesh Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: settings.accentColor }}></div>
         <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: '#af52de', animationDelay: '2s' }}></div>
         <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full blur-[180px] opacity-5" style={{ backgroundColor: '#ff375f' }}></div>
      </div>

      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl"></div>
          <div className="relative bg-[#1c1c1e]/90 ios-blur p-20 rounded-[5rem] flex flex-col items-center gap-12 border border-white/10 shadow-[0_0_150px_rgba(0,122,255,0.15)] spring-in">
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 border-[8px] border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-[8px] border-t-transparent rounded-full animate-spin" style={{ borderColor: settings.accentColor, borderTopColor: 'transparent' }}></div>
            </div>
            <p className="font-black text-3xl tracking-[0.4em] uppercase text-center min-w-[360px] leading-tight transition-all duration-300" style={{ color: settings.accentColor }}>
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/40 ios-blur border-b border-white/5 px-8 md:px-16 py-6 flex items-center justify-between transition-all duration-500">
        <div className="flex items-center gap-5 cursor-pointer group" onClick={() => {setView('home'); setActiveTool(null);}}>
          <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-[0_15px_40px_-5px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 active:scale-95" style={{ backgroundColor: settings.accentColor }}>
            <SparklesIcon className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter hidden sm:block uppercase">{settings.title}</h1>
        </div>
        
        <div className="flex items-center gap-6 spring-in">
          {view === 'editor' && activeProject && (
            <div className="flex items-center bg-white/[0.03] rounded-full p-2 border border-white/10 shadow-inner">
               <button onClick={() => setView('home')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white/30 transition-all active:scale-90"><XIcon className="w-6 h-6" /></button>
               <div className="w-px h-8 bg-white/10 mx-3" />
               <button onClick={() => setView('home')} className="text-[12px] font-black uppercase tracking-[0.4em] px-6 text-white/50">Studio v5.2</button>
            </div>
          )}
          <button onClick={() => setView('settings')} className="p-4 bg-white/5 rounded-full hover:bg-white/10 border border-white/5 transition-all active:scale-90 shadow-xl"><SettingsIcon className="w-6 h-6 text-white/30" /></button>
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
              <p className="text-white/40 text-2xl md:text-3xl font-medium max-w-3xl mx-auto leading-relaxed px-10">
                {settings.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-12">
                 <button onClick={() => setView('editor')} className="px-16 py-7 rounded-full text-black font-black uppercase text-xs tracking-[0.4em] shadow-[0_30px_70px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all bg-white">Start Mastering</button>
                 <button onClick={() => setView('format')} className="px-12 py-7 rounded-full text-white font-black uppercase text-xs tracking-[0.4em] border border-white/15 hover:bg-white/5 transition-all shadow-xl">Format Logic</button>
              </div>
            </div>

            {/* DESIGN-LED BENTO GRID */}
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-10 px-6 mb-48">
              <div 
                className="col-span-1 md:col-span-8 group relative p-16 bg-[#0e0e10] rounded-[5rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-1000 flex flex-col justify-end overflow-hidden min-h-[580px]"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" style={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${settings.accentColor}15, transparent)` }}></div>
                <div className="absolute top-20 left-20 w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-4xl group-hover:rotate-6 transition-transform duration-1000" style={{ backgroundColor: settings.accentColor }}>
                  <AdjustmentsIcon className="w-14 h-14 text-white" />
                </div>
                <div className="z-10">
                  <div className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 mb-5 px-1">Engine vCore 5.2 • 32-Bit F32</div>
                  <h3 className="text-6xl font-black tracking-tighter mb-8 leading-[0.9]">Studio Master</h3>
                  <p className="text-white/30 font-bold mb-14 leading-relaxed max-w-lg text-2xl">Non-destructive canvas for orchestrating pixels with absolute tonal precision.</p>
                  <div className="inline-flex bg-white text-black px-14 py-6 rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl group-hover:text-white transition-all" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = settings.accentColor} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>Launch Studio</div>
                </div>
              </div>

              <div 
                className="col-span-1 md:col-span-4 group relative p-14 bg-gradient-to-br from-[#af52de]/10 to-[#ff2d55]/10 rounded-[5rem] border border-white/10 shadow-3xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-1000 flex flex-col items-center text-center overflow-hidden min-h-[580px]"
                onClick={() => setView('crop')}
              >
                <div className="absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-24 h-24 bg-white/10 ios-blur rounded-3xl flex items-center justify-center mb-auto shadow-4xl group-hover:scale-110 transition-transform border border-white/5">
                  <CropIcon className="w-12 h-12 text-[#af52de]" />
                </div>
                <div className="mt-auto z-10">
                  <h3 className="text-5xl font-black tracking-tighter mb-5">Smart Crop</h3>
                  <p className="text-white/30 font-bold mb-14 leading-relaxed text-xl px-4">AI-assisted framing engine for social-standard proportions.</p>
                  <div className="bg-[#af52de] text-white px-12 py-6 rounded-full text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl group-hover:bg-white group-hover:text-[#af52de] transition-all">Refit Assets</div>
                </div>
              </div>

              <div 
                className="col-span-1 md:col-span-12 group relative p-16 bg-[#0a0a0c] rounded-[5rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.005] active:scale-[0.99] transition-all duration-1000 flex flex-col md:flex-row items-center justify-between overflow-hidden min-h-[380px]"
                onClick={() => setView('format')}
              >
                <div className="flex flex-col md:flex-row items-center gap-16">
                  <div className="w-28 h-28 bg-white/5 ios-blur rounded-[3rem] flex items-center justify-center shadow-4xl group-hover:rotate-6 transition-transform border border-white/5">
                    <ConvertIcon className="w-14 h-14" style={{ color: settings.accentColor }} />
                  </div>
                  <div className="text-center md:text-left z-10">
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 px-1">Batch Transcoding</div>
                    <h3 className="text-5xl font-black tracking-tighter mb-4 leading-none">Universal Converter</h3>
                    <p className="text-white/30 font-bold leading-relaxed text-xl max-w-md">Seamless switching between industry-standard and web formats.</p>
                  </div>
                </div>
                <div className="mt-12 md:mt-0 text-white px-16 py-7 rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl group-hover:bg-white transition-all" style={{ backgroundColor: settings.accentColor }} onMouseEnter={(e) => e.currentTarget.style.color = settings.accentColor} onMouseLeave={(e) => e.currentTarget.style.color = 'white'}>Open Logic Lab</div>
              </div>
            </div>

            {/* SYSTEM ANALYTICS SECTION */}
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 px-6 mb-48">
               <ActivityMap logs={logs} accentColor={settings.accentColor} />
               <div className="bg-[#0e0e10]/80 ios-blur rounded-[4rem] p-12 border border-white/5 flex flex-col justify-center gap-12 shadow-3xl">
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 px-1">Silicon Architecture</h4>
                     <p className="text-4xl font-black tracking-tighter">Engine Performance</p>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                     {[
                       { t: 'CHROMA ACCURACY', v: '99.9%', d: 'Lab Delta-E Standard' },
                       { t: 'LATENCY BASELINE', v: '12ms', d: 'Real-time Buffer' },
                       { t: 'BIT DEPTH', v: '32-Bit', d: 'Floating Point' },
                       { t: 'IO VELOCITY', v: '4.2GB/s', d: 'Parallel Processing' }
                     ].map(s => (
                       <div key={s.t} className="space-y-2 group">
                          <p className="text-[10px] font-black uppercase text-white/10 tracking-[0.3em] group-hover:text-white/30 transition-colors">{s.t}</p>
                          <p className="text-3xl font-black tabular-nums transition-transform group-hover:scale-105" style={{ color: settings.accentColor }}>{s.v}</p>
                          <p className="text-[12px] font-bold text-white/30">{s.d}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="py-16 max-w-5xl mx-auto animate-in slide-in-from-bottom-16 duration-1000">
             {!isAuthorized ? (
               <div id="passcode-container" className="flex flex-col items-center gap-16 pt-24 transition-transform">
                  <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center ios-blur border border-white/10 shadow-4xl"><SettingsIcon className="w-12 h-12 text-white/40" /></div>
                  <div className="text-center space-y-4">
                    <h2 className="text-5xl font-black tracking-tight">System Auth</h2>
                    <p className="text-white/30 text-xl font-medium px-20 leading-relaxed">Verified credentials required to access Studio Control Center.</p>
                  </div>
                  <div className="flex gap-6">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-5 h-5 rounded-full border border-white/20 transition-all duration-500 ${passcodeAttempt.length > i ? 'bg-white scale-150 shadow-[0_0_25px_rgba(255,255,255,0.7)]' : 'bg-transparent scale-100'}`}></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((n, i) => (
                      <button 
                        key={i} 
                        disabled={n === ''}
                        onClick={() => n === 'DEL' ? setPasscodeAttempt(p => p.slice(0, -1)) : handlePasscodeChange(n.toString())}
                        className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-medium transition-all active:scale-90 ${n === '' ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 border border-white/5 shadow-2xl'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
               </div>
             ) : (
               <div className="space-y-20 pb-40 px-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h2 className="text-6xl font-black tracking-tighter">Control Center</h2>
                        <p className="text-white/30 text-sm font-black uppercase tracking-[0.5em] mt-3">Root Access • Logic Core 5.2.0</p>
                    </div>
                    <button onClick={() => {setIsAuthorized(false); setView('home');}} className="px-12 py-5 bg-white/5 rounded-full text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-colors border border-white/10 shadow-3xl">Relock Console</button>
                  </div>

                  {/* TELEMETRY CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     {[
                        { l: 'Imports', v: analyticsStats.totalUploads, c: '#ff9500' },
                        { l: 'Orchestrations', v: analyticsStats.totalInteractions, c: settings.accentColor },
                        { l: 'Network Nodes', v: analyticsStats.secureVisits, c: '#32d74b' }
                     ].map(s => (
                        <div key={s.l} className="bg-[#0e0e10] p-12 rounded-[3.5rem] border border-white/5 shadow-3xl space-y-8 group hover:border-white/10 transition-colors">
                            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20">{s.l}</p>
                            <p className="text-7xl font-black tabular-nums transition-transform group-hover:scale-105" style={{ color: s.c }}>{s.v}</p>
                        </div>
                     ))}
                  </div>

                  {/* LOGS INTERFACE */}
                  <div className="space-y-8">
                     <div className="flex items-center justify-between px-10">
                        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-white/30">System Telemetry</p>
                        <button onClick={clearLogs} className="text-[11px] font-black uppercase tracking-widest text-[#ff453a] hover:opacity-70 transition-opacity">Purge Activity</button>
                     </div>
                     <div className="bg-[#0e0e10] rounded-[4rem] border border-white/5 shadow-4xl overflow-hidden flex flex-col max-h-[700px]">
                        <div className="overflow-y-auto no-scrollbar flex-1">
                           {logs.length === 0 ? (
                              <div className="p-40 text-center text-white/10 font-black uppercase text-xs tracking-[0.8em]">No Telemetry Detected</div>
                           ) : (
                              <div className="flex flex-col">
                                 {logs.map((log, idx) => (
                                    <div key={log.id} className={`p-10 flex items-center gap-10 hover:bg-white/[0.02] transition-colors ${idx !== logs.length-1 ? 'border-b border-white/5' : ''}`}>
                                       <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-3xl ${
                                          log.type === 'visit' ? 'bg-[#32d74b]/10 text-[#32d74b]' :
                                          log.type === 'click' ? 'bg-[#007aff]/10 text-[#007aff]' :
                                          log.type === 'security' ? 'bg-[#ff453a]/10 text-[#ff453a]' :
                                          'bg-[#ff9500]/10 text-[#ff9500]'
                                       }`}>
                                          {log.type === 'visit' ? <InfoIcon className="w-8 h-8" /> :
                                           log.type === 'click' ? <SparklesIcon className="w-8 h-8" /> :
                                           log.type === 'security' ? <SettingsIcon className="w-8 h-8" /> :
                                           <UploadIcon className="w-8 h-8" />}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-8 mb-3">
                                             <p className="text-[16px] font-black uppercase tracking-[0.2em] truncate">{log.details}</p>
                                             <span className="text-[11px] font-black text-white/20 tabular-nums whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                          </div>
                                          <div className="flex items-center gap-5">
                                             <span className="text-[12px] text-white/40 font-bold">{log.location || 'Encrypted Entry'}</span>
                                             <div className="w-2 h-2 bg-white/10 rounded-full"></div>
                                             <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/20">{log.browser} • {log.os} • {log.screenSize}</span>
                                          </div>
                                       </div>
                                       {log.thumbnail && (
                                          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-3xl relative group/item">
                                             <img src={log.thumbnail} className="w-full h-full object-cover transition-transform duration-1000 group-hover/item:scale-125" />
                                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                                <EyeIcon className="w-6 h-6" />
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* STUDIO IDENTITY SETTINGS */}
                  <div className="space-y-12">
                     <h3 className="text-4xl font-black tracking-tighter px-10">Identity Orchestration</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-[#0e0e10] rounded-[4rem] p-12 border border-white/5 shadow-3xl flex flex-col gap-12">
                           <div className="space-y-5">
                              <label className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 px-3">Studio Name</label>
                              <input value={settings.title} onChange={e => setSettings({...settings, title: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 text-2xl font-black outline-none text-white focus:border-[#007aff] transition-all" />
                           </div>
                           <div className="space-y-5">
                              <label className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 px-3">Accent Signature</label>
                              <div className="flex items-center gap-8">
                                 <input type="color" value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="w-20 h-20 bg-transparent rounded-3xl cursor-pointer overflow-hidden border-0 shadow-2xl" />
                                 <input value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="flex-1 bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 text-2xl font-black outline-none text-white font-mono" />
                              </div>
                           </div>
                        </div>

                        <div className="bg-[#0e0e10] rounded-[4rem] p-12 border border-white/5 shadow-3xl flex flex-col gap-12">
                           <div className="space-y-5">
                              <label className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 px-3">Headline Control</label>
                              <input value={settings.heroHeadline} onChange={e => setSettings({...settings, heroHeadline: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 text-2xl font-black outline-none text-white" />
                           </div>
                           <div className="space-y-5">
                              <label className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 px-3">Subtitle String</label>
                              <input value={settings.heroSubheadline} onChange={e => setSettings({...settings, heroSubheadline: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 text-2xl font-black outline-none text-white" />
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-8">
                        <button onClick={() => {if(confirm("Factory reset entire Studio?")) setSettings(DEFAULT_SETTINGS);}} className="flex-1 py-8 bg-white/5 border border-white/5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] hover:bg-[#ff453a]/10 hover:text-[#ff453a] transition-all shadow-3xl">Factory Reset</button>
                        <button onClick={() => setView('home')} className="flex-[2] py-8 rounded-[2.5rem] text-white font-black uppercase text-[11px] tracking-[0.4em] shadow-4xl transition-all hover:scale-[1.02] active:scale-98" style={{ backgroundColor: settings.accentColor }}>Synchronize Changes</button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {view === 'editor' && activeProject && (
            <div className="h-full flex flex-col lg:flex-row gap-10 animate-in fade-in duration-1000 relative z-10">
                <div className={`flex-1 flex flex-col gap-8 transition-all duration-700 ${activeTool ? 'lg:scale-[0.98]' : 'scale-100'}`}>
                    <div className="flex items-center gap-6 overflow-x-auto pb-8 no-scrollbar px-2">
                        <button onClick={() => {setView('home'); setActiveTool(null);}} className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 shadow-3xl"><XIcon className="w-8 h-8 opacity-40"/></button>
                        {projects.map((proj, idx) => (
                            <div 
                              key={proj.id} 
                              onClick={() => { setActiveIndex(idx); setActiveTool(null); }}
                              className={`group relative w-24 h-24 rounded-[3rem] flex-shrink-0 border-[5px] transition-all duration-700 cursor-pointer overflow-visible ${
                                  activeIndex === idx ? 'scale-110 shadow-[0_30px_70px_rgba(0,0,0,0.6)] z-20' : 'border-transparent opacity-40 hover:opacity-100 z-10'
                              }`}
                              style={{ borderColor: activeIndex === idx ? settings.accentColor : 'transparent' }}
                            >
                            <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                                <img src={proj.url} className="w-full h-full object-cover transition-transform duration-1000 pointer-events-none" />
                            </div>
                            <div className="absolute -top-3 -right-3 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 border border-black/5">
                                <GripVerticalIcon className="w-5 h-5" />
                            </div>
                            </div>
                        ))}
                        <label className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer active:scale-95 group shadow-3xl">
                            <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                            <UploadIcon className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </label>
                    </div>

                    <div className="relative flex-1 bg-[#0c0c0e]/90 ios-blur rounded-[5rem] border border-white/5 shadow-[0_50px_120px_-30px_rgba(0,0,0,1)] overflow-hidden group transition-all duration-1000">
                        <div 
                          ref={previewContainerRef} 
                          className={`relative w-full h-full min-h-[600px] flex items-center justify-center overflow-hidden transition-all duration-700 ${isPanning ? 'bg-black/50 cursor-grabbing scale-[1.03]' : 'bg-transparent cursor-grab scale-100'}`}
                          onMouseDown={(e) => {
                             if (activeTool === ToolType.CROP) return;
                             e.preventDefault();
                             setIsPanning(true);
                             dragStartPos.current = { x: e.clientX, y: e.clientY };
                             panStartOffset.current = { x: panOffset.x, y: panOffset.y };
                          }}
                        >
                          <div 
                              className={`relative will-change-transform ${(!isPanning) ? 'transition-transform duration-700' : ''}`} 
                              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }}
                          >
                              <img 
                                ref={imageRef} 
                                src={isComparing ? activeProject.history[0].url : activeProject.url} 
                                style={{ filter: activeTool === ToolType.ADJUST ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)` : 'none' }}
                                className="max-w-[85vw] max-h-[75vh] object-contain shadow-[0_40px_100px_-25px_rgba(0,0,0,0.95)] pointer-events-none rounded-[2rem]" 
                              />
                              
                              {activeTool === ToolType.CROP && (
                                <div 
                                    className="absolute border border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] animate-in fade-in duration-700"
                                    style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}
                                >
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                                       {[...Array(9)].map((_,i) => <div key={i} className="border border-white/20"></div>)}
                                    </div>
                                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(h => (
                                       <div key={h} className={`absolute w-10 h-10 border-white border-[3px] rounded-[3px] cursor-nwse-resize z-10 ${h.replace('-', ' ')}`}></div>
                                    ))}
                                </div>
                              )}
                          </div>
                          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/90 ios-blur border border-white/10 rounded-full p-3 px-10 shadow-4xl opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-6 group-hover:translate-y-0">
                              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-5 hover:bg-white/10 rounded-full transition-all active:scale-90"><ZoomOutIcon className="w-7 h-7 text-white/60" /></button>
                              <span className="text-[17px] font-black w-20 text-center tabular-nums tracking-tighter">{Math.round(zoom*100)}%</span>
                              <button onClick={() => setZoom(z => Math.min(6, z + 0.2))} className="p-5 hover:bg-white/10 rounded-full transition-all active:scale-90"><ZoomInIcon className="w-7 h-7 text-white/60" /></button>
                          </div>
                        </div>
                    </div>
                </div>

                <div className={`w-full lg:w-[460px] flex flex-col gap-8 transition-all duration-700 ${activeTool ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none hidden lg:flex'}`}>
                    <div className="bg-[#111113] p-12 rounded-[5rem] border border-white/5 shadow-4xl space-y-12 max-h-[85vh] overflow-y-auto no-scrollbar spring-in">
                        {activeTool ? (
                        <div className="animate-in slide-in-from-right-12 duration-1000 flex flex-col gap-12">
                            <div className="flex items-center justify-between">
                               <h3 className="text-4xl font-black uppercase tracking-tighter transition-all" style={{ color: settings.accentColor }}>{activeTool}</h3>
                               <button onClick={() => setActiveTool(null)} className="p-5 hover:bg-white/5 rounded-full transition-all active:rotate-90"><XIcon className="w-7 h-7 text-white/30" /></button>
                            </div>
                            
                            {activeTool === ToolType.ADJUST && (
                            <div className="space-y-14 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {[{l:'Exposure', v:brightness, s:setBrightness}, {l:'Contrast', v:contrast, s:setContrast}, {l:'Saturate', v:saturate, s:setSaturate}].map(a => (
                                <div key={a.l} className="space-y-7">
                                    <div className="flex justify-between text-[12px] font-black uppercase tracking-[0.4em] text-white/30">
                                       <span>{a.l}</span>
                                       <span className="text-white tabular-nums">{a.v}%</span>
                                    </div>
                                    <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                                </div>
                                ))}
                                <div className="flex gap-6 pt-8">
                                   <button onClick={() => {setBrightness(100); setContrast(100); setSaturate(100);}} className="flex-1 py-6 rounded-[2.5rem] bg-white/5 font-black uppercase text-[11px] tracking-[0.4em] transition-all hover:bg-white/10 active:scale-95 border border-white/5 shadow-xl">Reset</button>
                                   <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Precision Master')} className="flex-[2] py-6 rounded-[2.5rem] text-white font-black uppercase text-[11px] tracking-[0.4em] shadow-4xl active:scale-95 transition-all" style={{ backgroundColor: settings.accentColor }}>Apply Master</button>
                                </div>
                            </div>
                            )}

                            {activeTool === ToolType.FILTER && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="flex overflow-x-auto no-scrollbar gap-4 bg-black/40 p-3 rounded-[2.5rem] border border-white/5">
                                   {(['Modern', 'Studio', 'Vintage', 'Cinematic', 'Artistic', 'Glitch', 'Cartoon'] as const).map(cat => (
                                       <button key={cat} onClick={() => setLookCategory(cat)} className={`flex-1 min-w-[100px] py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${lookCategory === cat ? 'text-white shadow-3xl' : 'text-white/20 hover:text-white'}`} style={{ backgroundColor: lookCategory === cat ? settings.accentColor : '' }}>{cat}</button>
                                   ))}
                                </div>
                                <div className="grid grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto no-scrollbar pb-16">
                                   {lookPresets[lookCategory as keyof typeof lookPresets].map((p) => (
                                       <button key={p.name} onClick={() => applyTool((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col items-center gap-5 group bg-black/20 p-5 rounded-[3rem] border border-white/5 transition-all active:scale-95 hover:border-white/20 shadow-xl">
                                          <div className="w-full aspect-square rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-1000 group-hover:scale-105 shadow-2xl">
                                             <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                          </div>
                                          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white transition-colors">{p.name}</span>
                                       </button>
                                   ))}
                                </div>
                            </div>
                            )}
                        </div>
                        ) : (
                        <div className="h-[460px] flex flex-col items-center justify-center text-center gap-10 animate-in fade-in duration-1000">
                            <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 group transition-all duration-1000 hover:rotate-12 shadow-4xl">
                                <SparklesIcon className="w-12 h-12 text-white/10 transition-colors group-hover:text-white" />
                            </div>
                            <div className="space-y-4">
                               <h4 className="font-black uppercase tracking-[0.5em] text-[13px] text-white/40">Canvas Selection</h4>
                               <p className="text-white/20 text-lg font-medium px-20 leading-relaxed">Orchestrate your assets by selecting an engine from the toolbar below.</p>
                            </div>
                        </div>
                        )}
                    </div>

                    <div className={`bg-[#111113] p-12 rounded-[5rem] border border-white/5 shadow-4xl flex items-center justify-between transition-all duration-1000 ${activeTool ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none hidden lg:flex'}`}>
                        <div className="min-w-0">
                           <h3 className="text-3xl font-black truncate mb-3">{activeProject.metadata.name}</h3>
                           <div className="flex gap-4">
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-white/5 rounded-full text-white/30 tabular-nums">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full tabular-nums shadow-2xl" style={{ color: settings.accentColor, backgroundColor: `${settings.accentColor}10` }}>{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                           </div>
                        </div>
                        <a href={activeProject.url} download={`studio_${activeProject.metadata.name}`} className="bg-white text-black px-14 py-7 rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-4xl transition-all hover:scale-105 active:scale-95" onMouseEnter={e => {e.currentTarget.style.backgroundColor = settings.accentColor; e.currentTarget.style.color = 'white'}} onMouseLeave={e => {e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = 'black'}}>Export</a>
                    </div>
                </div>
            </div>
        )}

        {view === 'format' && (
           <div className="py-28 flex flex-col items-center gap-20 animate-in fade-in slide-in-from-bottom-16 duration-1000 max-w-6xl mx-auto relative z-10">
              <div className="text-center space-y-8">
                 <div className="w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-12 shadow-[0_40px_80px_-15px_rgba(0,122,255,0.4)] transition-transform hover:scale-110 active:scale-95 border border-white/10 bg-white/5 ios-blur" style={{ color: settings.accentColor }}>
                    <ConvertIcon className="w-14 h-14" />
                 </div>
                 <h2 className="text-7xl font-black tracking-tighter">Universal Lab</h2>
                 <p className="text-white/30 text-2xl font-medium max-w-3xl mx-auto leading-relaxed px-12">Batch conversion and transcoding suite for professional-grade imaging workflows.</p>
              </div>

              {projects.length === 0 ? (
                <div className="w-full bg-[#111113]/80 ios-blur p-24 rounded-[5rem] border border-white/5 shadow-4xl text-center group cursor-pointer relative overflow-hidden transition-all active:scale-[0.99] hover:border-white/10" style={{ borderColor: `${settings.accentColor}25` }}>
                   <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(Array.from(e.target.files || []))} accept="image/*" />
                   <div className="flex flex-col items-center gap-12 py-16">
                       <div className="w-28 h-28 border-[3px] border-dashed border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all group-hover:border-white/40 shadow-inner">
                         <UploadIcon className="w-12 h-12 opacity-40 group-hover:opacity-100" style={{ color: settings.accentColor }} />
                       </div>
                       <div className="space-y-4">
                         <p className="text-4xl font-black tracking-tight transition-colors" style={{ color: settings.accentColor }}>Staging Area</p>
                         <p className="text-white/20 font-black uppercase tracking-[0.6em] text-[11px]">IMPORT STUDIO ASSETS</p>
                       </div>
                       <button className="bg-white/5 px-16 py-6 rounded-full text-[12px] font-black uppercase tracking-[0.4em] border border-white/10 group-hover:text-white transition-all shadow-2xl" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = settings.accentColor} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Browse Local Storage</button>
                   </div>
                </div>
              ) : (
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
                   <div className="lg:col-span-8 space-y-10">
                      <div className="bg-[#111113] p-14 rounded-[4rem] border border-white/5 shadow-3xl">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 mb-10 px-4">Active Staging</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-8">
                            {projects.map((p, idx) => (
                              <div key={p.id} className="relative aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 group shadow-2xl">
                                 <img src={p.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" />
                                 <button onClick={() => setProjects(prev => prev.filter(item => item.id !== p.id))} className="absolute top-3 right-3 w-8 h-8 bg-black/80 ios-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 shadow-2xl"><XIcon className="w-4 h-4 text-white" /></button>
                              </div>
                            ))}
                            <label className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all hover:border-white/20 shadow-inner">
                               <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                               <UploadIcon className="w-8 h-8 opacity-20" />
                            </label>
                         </div>
                      </div>
                   </div>
                   <div className="lg:col-span-4">
                      <div className="bg-[#111113] p-12 rounded-[4rem] border border-white/5 shadow-3xl space-y-14 sticky top-40">
                         <div className="space-y-8">
                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-4">Encoding Profile</p>
                            <div className="grid grid-cols-1 gap-5">
                               {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                                 <button 
                                   key={fmt}
                                   className={`py-8 px-10 rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-between border ${fmt === 'image/jpeg' ? 'bg-white text-black border-white shadow-4xl' : 'bg-white/5 text-white/20 border-white/5 hover:text-white'}`}
                                 >
                                   <span>{fmt.split('/')[1]}</span>
                                   <div className={`w-5 h-5 rounded-full border-[3px] ${fmt === 'image/jpeg' ? 'bg-black border-black shadow-[0_0_15px_white]' : 'border-white/10'}`}></div>
                                 </button>
                               ))}
                            </div>
                         </div>
                         <button className="w-full py-8 rounded-[2.5rem] text-white font-black uppercase text-[13px] tracking-[0.4em] shadow-[0_30px_70px_rgba(0,122,255,0.35)] hover:scale-[1.02] active:scale-98 transition-all" style={{ backgroundColor: settings.accentColor }}>Finalize Batch Export</button>
                      </div>
                   </div>
                </div>
              )}
           </div>
        )}

      </main>

      <footer className="w-full py-40 px-12 border-t border-white/5 bg-black relative z-10 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start justify-between gap-32">
          <div className="flex flex-col items-start gap-10 max-w-md">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-4xl" style={{ backgroundColor: settings.accentColor }}><SparklesIcon className="text-white w-7 h-7" /></div>
                <h4 className="text-4xl font-black tracking-tighter uppercase">{settings.title}</h4>
             </div>
             <p className="text-white/20 font-medium leading-relaxed text-xl">High-fidelity asset orchestration for the modern digital studio. Engineered for precision, designed for inspiration.</p>
             <p className="text-[11px] font-black uppercase tracking-[0.7em] text-white/10 pt-8">{settings.footerCopyright}</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-10 text-center md:text-right">
             <div className="flex items-center gap-8">
                <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/10">Studio Principal</p>
                <button onClick={() => setView('settings')} className="p-4 bg-white/5 rounded-full hover:bg-white/10 border border-white/5 transition-all active:scale-90 shadow-2xl"><SettingsIcon className="w-6 h-6 text-white/20" /></button>
             </div>
             <a href={settings.programmerUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-8 hover:scale-105 transition-all bg-white/[0.03] p-8 rounded-[3rem] border border-white/5 shadow-3xl" onMouseEnter={e => e.currentTarget.style.borderColor = settings.accentColor} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                <div className="text-right">
                   <span className="block text-4xl font-black tracking-tighter text-white transition-colors group-hover:text-white/90">{settings.programmerName}</span>
                   <span className="block text-[12px] font-black uppercase tracking-[0.3em] text-white/20 mt-2">{settings.programmerRole}</span>
                </div>
                <div className="w-20 h-20 rounded-[2.2rem] border border-white/10 overflow-hidden shadow-4xl transition-transform group-hover:rotate-6"><img src={settings.programmerImage} className="w-full h-full object-cover" alt={settings.programmerName} /></div>
             </a>
          </div>

          <div className="grid grid-cols-2 gap-x-24 gap-y-10 text-[12px] font-black uppercase tracking-[0.6em] text-white/10">
            <span className="cursor-pointer transition-all hover:text-white">Privacy</span>
            <span className="cursor-pointer transition-all hover:text-white">Security</span>
            <span className="cursor-pointer transition-all hover:text-white">Framework</span>
            <a href={`mailto:${settings.contactEmail}`} className="cursor-pointer transition-all hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}
