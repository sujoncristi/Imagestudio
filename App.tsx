
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem, ViewType, SiteSettings, AppLog } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon,
  GripVerticalIcon, ConvertIcon, SettingsIcon, ChevronRightIcon, BWIcon, BorderIcon, QrCodeIcon, LinkIcon, GrainIcon
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
  footerCopyright: "© 2024 IMAGERIZE STUDIO • CORE v5.5",
  accentColor: "#007aff",
  passcode: "0000",
  contactEmail: "contact@imagerize.studio",
  showNeuralTools: true
};

const filterSets = {
  Essential: [
    { name: 'Original', f: 'none' },
    { name: 'Vivid', f: 'saturate(1.4) contrast(1.1) brightness(1.05)' },
    { name: 'Clean', f: 'brightness(1.05) saturate(1.1)' },
    { name: 'Pure', f: 'brightness(1.1) contrast(1.05) saturate(0.9)' },
    { name: 'Dusk', f: 'sepia(0.2) brightness(0.9) saturate(1.2)' },
  ],
  Cinematic: [
    { name: 'Teal/Orange', f: 'hue-rotate(-10deg) saturate(1.5) contrast(1.2) sepia(0.1)' },
    { name: 'Blockbuster', f: 'contrast(1.4) saturate(1.3) brightness(0.9)' },
    { name: 'Noir', f: 'grayscale(100%) contrast(1.5) brightness(0.8)' },
    { name: 'Matrix', f: 'hue-rotate(90deg) saturate(1.2) contrast(1.1)' },
    { name: 'Indie', f: 'sepia(0.3) contrast(0.9) brightness(1.1)' },
  ],
  Vintage: [
    { name: '1970', f: 'sepia(0.6) saturate(1.4) contrast(0.9)' },
    { name: 'Polaroid', f: 'brightness(1.1) contrast(1.1) sepia(0.2) saturate(0.8)' },
    { name: 'Film Stock', f: 'contrast(1.2) brightness(0.95) saturate(1.1) hue-rotate(-5deg)' },
    { name: 'Antique', f: 'sepia(1) contrast(0.8) brightness(1.1)' },
    { name: 'Muted', f: 'saturate(0.4) contrast(1.1)' },
  ],
  Artistic: [
    { name: 'Cyber', f: 'hue-rotate(180deg) saturate(2) contrast(1.2)' },
    { name: 'Neon', f: 'hue-rotate(280deg) saturate(2.5) contrast(1.3)' },
    { name: 'Dreamy', f: 'blur(0.5px) brightness(1.1) saturate(0.8)' },
    { name: 'Acid', f: 'invert(0.1) hue-rotate(90deg) saturate(3)' },
    { name: 'Infrared', f: 'invert(0.8) hue-rotate(180deg) saturate(2)' },
  ]
};

const HeroVisual = ({ accentColor }: { accentColor: string }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 4), 6000);
    return () => clearInterval(timer);
  }, []);

  const getStyle = (s: number) => {
    const isMain = s === step;
    switch(s) {
      case 1: return { filter: 'brightness(1.1) saturate(1.4) contrast(1.1)', opacity: isMain ? 1 : 0 };
      case 2: return { filter: 'grayscale(100%) contrast(1.25)', opacity: isMain ? 1 : 0 };
      case 3: return { filter: 'sepia(0.2) contrast(1.1) brightness(1.05)', opacity: isMain ? 1 : 0 };
      default: return { filter: 'none', opacity: isMain ? 1 : 0 };
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto aspect-[2.4/1] mb-12 px-4 group overflow-hidden rounded-[4rem] border border-white/5 shadow-2xl bg-black/40 ios-blur">
      {[0, 1, 2, 3].map((s) => (
         <img 
          key={s}
          src="https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1600&auto=format&fit=crop" 
          className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] object-cover rounded-[3.5rem] transition-all duration-[2500ms] ease-in-out" 
          style={getStyle(s)} 
          alt="Showcase"
        />
      ))}
      <div className="absolute top-12 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <div className="bg-black/90 ios-blur px-10 py-3 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-[0.8em]" style={{ color: accentColor }}>
          ENGINE STATUS: ACTIVE
        </div>
      </div>
    </div>
  );
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
  
  // Editor States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [filterCategory, setFilterCategory] = useState<keyof typeof filterSets>('Essential');
  
  // Tool-specific states
  const [resizeW, setResizeW] = useState<string>('');
  const [resizeH, setResizeH] = useState<string>('');
  const [grainAmount, setGrainAmount] = useState(0);
  const [pixelScale, setPixelScale] = useState(0.1);
  const [compressQuality, setCompressQuality] = useState(0.8);
  const [borderSize, setBorderSize] = useState(2);
  const [borderColor, setBorderColor] = useState('#ffffff');

  // Lab (Format) states
  const [labFormat, setLabFormat] = useState('image/jpeg');
  const [labQuality, setLabQuality] = useState(0.9);

  // QR State
  const [qrText, setQrText] = useState('');
  const [qrImage, setQrImage] = useState('');

  const activeProject = projects[activeIndex] || null;

  useEffect(() => {
    if (activeProject) {
      setResizeW(activeProject.metadata.width.toString());
      setResizeH(activeProject.metadata.height.toString());
    }
  }, [activeIndex, projects]);

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

  const handleUpload = async (files: File[]) => {
    startTask('Initializing Core...');
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
    if (view !== 'format') setView('editor');
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
      
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      updatedHistory.push({ url, metadata: newMeta, action: actionName });
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
      setActiveTool(null);
    } catch (e) {
      alert("Action failed.");
    } finally { endTask(); }
  };

  const handleAutoEnhance = async () => {
    if (!activeProject) return;
    startTask('Neural Deep Scan...');
    try {
      const analysisJson = await geminiService.analyzeImage(activeProject.url, activeProject.metadata.format);
      const analysis = JSON.parse(analysisJson);
      setAiReview(analysis.aesthetic_review);
      
      const img = await imageService.loadImage(activeProject.url);
      const { brightness: b, contrast: c, saturation: s } = analysis.adjustments;
      const enhancedUrl = await imageService.applyFilter(img, `brightness(${b}%) contrast(${c}%) saturate(${s}%)`);
      const finalImg = await imageService.loadImage(enhancedUrl);
      const blob = await (await fetch(enhancedUrl)).blob();
      
      const updatedHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
      const newMeta = { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type };
      updatedHistory.push({ url: enhancedUrl, metadata: newMeta, action: 'Neural Polish' });
      
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url: enhancedUrl, metadata: newMeta, history: updatedHistory, historyIndex: updatedHistory.length - 1 };
      setProjects(newProjects);
      
      setTimeout(() => setAiReview(null), 8000);
    } catch (e) {
      console.error(e);
      const img = await imageService.loadImage(activeProject.url);
      const url = await imageService.applyFilter(img, 'brightness(1.1) contrast(1.1) saturate(1.1)');
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      const newHistory = [...activeProject.history, { url, metadata: { ...activeProject.metadata, size: blob.size }, action: 'Auto Polish' }];
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, history: newHistory, historyIndex: newHistory.length - 1 };
      setProjects(newProjects);
    } finally { endTask(); }
  };

  const handleBatchConvert = async () => {
    if (projects.length === 0) return;
    startTask('Orchestrating Batch Transcode...');
    try {
      for (const proj of projects) {
        const img = await imageService.loadImage(proj.url);
        const url = await imageService.compressImage(img, labQuality, labFormat);
        const link = document.createElement('a');
        link.href = url;
        const ext = labFormat.split('/')[1];
        link.download = `converted_${proj.metadata.name.split('.')[0]}.${ext}`;
        link.click();
      }
    } finally { endTask(); }
  };

  const handleGenerateQR = () => {
    if (!qrText) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrText)}`;
    setQrImage(url);
  };

  // Fix: Added the missing importQRToStudio function to handle importing generated QR codes into the studio.
  const importQRToStudio = async () => {
    if (!qrImage) return;
    startTask('Importing QR to Studio...');
    try {
      const img = await imageService.loadImage(qrImage);
      const meta: ImageMetadata = { 
        width: img.width, height: img.height, format: 'image/png', 
        size: 0, originalSize: 0, name: 'Studio_QR.png' 
      };
      const newProj: ProjectImage = { 
        id: Math.random().toString(36).substr(2, 9), 
        url: qrImage, 
        metadata: meta, 
        history: [{ url: qrImage, metadata: meta, action: 'QR Import' }], 
        historyIndex: 0 
      };
      setProjects(prev => [...prev, newProj]);
      setActiveIndex(projects.length);
      setView('editor');
    } catch (e) {
      alert("Import failed.");
    } finally { endTask(); }
  };

  const undoAction = () => {
    if (!activeProject || activeProject.historyIndex <= 0) return;
    const newProjects = [...projects];
    const newIdx = activeProject.historyIndex - 1;
    newProjects[activeIndex] = { ...activeProject, url: activeProject.history[newIdx].url, metadata: activeProject.history[newIdx].metadata, historyIndex: newIdx };
    setProjects(newProjects);
  };

  const redoAction = () => {
    if (!activeProject || activeProject.historyIndex >= activeProject.history.length - 1) return;
    const newProjects = [...projects];
    const newIdx = activeProject.historyIndex + 1;
    newProjects[activeIndex] = { ...activeProject, url: activeProject.history[newIdx].url, metadata: activeProject.history[newIdx].metadata, historyIndex: newIdx };
    setProjects(newProjects);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30 overflow-x-hidden">
      
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-20 animate-pulse" style={{ backgroundColor: settings.accentColor }}></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-20 animate-pulse" style={{ backgroundColor: '#af52de' }}></div>
      </div>

      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-10">
            <div className="w-24 h-24 border-[8px] border-white/5 border-t-white rounded-full animate-spin"></div>
            <p className="font-black text-2xl tracking-[0.5em] uppercase text-white/50 animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* AI Insight Overlay */}
      {aiReview && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[80] w-full max-w-lg px-6 animate-in slide-in-from-top-12 duration-700">
          <div className="bg-[#1c1c1e]/90 ios-blur border border-white/10 rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex items-start gap-6">
            <div className="w-14 h-14 bg-[#007aff] rounded-2xl flex items-center justify-center flex-shrink-0 animate-float">
              <MagicWandIcon className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Neural Analysis Insight</h4>
              <p className="text-white text-lg font-medium leading-relaxed italic">"{aiReview}"</p>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/40 ios-blur border-b border-white/5 px-8 md:px-16 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => {setView('home'); setActiveTool(null);}}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: settings.accentColor }}>
            <SparklesIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">{settings.title}</h1>
        </div>
        <div className="flex gap-4">
           {view !== 'home' && (
             <button onClick={() => setView('home')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5">
                <XIcon className="w-6 h-6 text-white/40" />
             </button>
           )}
           <button onClick={() => setView('settings')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5">
              <SettingsIcon className="w-6 h-6 text-white/40" />
           </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1500px] mx-auto p-6 md:p-12 overflow-hidden">
        
        {view === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <HeroVisual accentColor={settings.accentColor} />
            <div className="text-center space-y-8 mb-32">
              <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8]">{settings.heroHeadline}<br/><span style={{ color: settings.accentColor }}>{settings.heroSubheadline}</span></h2>
              <p className="text-white/40 text-2xl font-medium max-w-2xl mx-auto">{settings.heroDescription}</p>
              
              {/* Studio Status Panel */}
              <div className="flex justify-center gap-8 mt-12">
                 <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-full flex items-center gap-4 ios-blur">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Studio Core: v5.5 Normal</span>
                 </div>
                 <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-full flex items-center gap-4 ios-blur">
                    <SparklesIcon className="w-4 h-4" style={{ color: settings.accentColor }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Neural Models: Synced</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-32">
              <div 
                className="md:col-span-8 group relative p-16 bg-[#1c1c1e] rounded-[4rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all flex flex-col justify-end min-h-[500px] overflow-hidden"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute top-16 left-16 w-24 h-24 rounded-3xl flex items-center justify-center shadow-4xl" style={{ backgroundColor: settings.accentColor }}>
                  <AdjustmentsIcon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-6xl font-black tracking-tighter mb-4 transition-transform group-hover:translate-x-2">Studio Master</h3>
                <p className="text-white/30 text-2xl font-bold max-w-md">Precision non-destructive orchestration for imaging assets.</p>
                <div className="mt-10 bg-white text-black px-12 py-5 rounded-full text-xs font-black uppercase tracking-widest inline-block w-fit group-hover:bg-[#007aff] group-hover:text-white transition-all shadow-2xl">Enter Lab</div>
              </div>

              <div 
                className="md:col-span-4 group relative p-12 bg-gradient-to-br from-[#af52de]/30 to-[#ff375f]/30 rounded-[4rem] border border-white/10 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all flex flex-col items-center text-center min-h-[500px]"
                onClick={() => { setView('editor'); setActiveTool(ToolType.CROP); }}
              >
                <div className="w-20 h-20 bg-white/20 ios-blur rounded-3xl flex items-center justify-center mb-auto border border-white/5 shadow-xl">
                  <CropIcon className="w-10 h-10 text-white" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-4xl font-black tracking-tighter mb-4 transition-transform group-hover:-translate-y-1">Reframing</h3>
                  <p className="text-white/80 text-xl font-bold px-4">Intelligent logic for standard asset compositions.</p>
                </div>
              </div>

              <div 
                className="md:col-span-12 group relative p-12 bg-[#0a0a0c] rounded-[4rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.005] transition-all flex flex-col md:flex-row items-center justify-between min-h-[300px]"
                onClick={() => setView('format')}
              >
                 <div className="flex items-center gap-12 ml-6">
                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                       <ConvertIcon className="w-12 h-12" style={{ color: settings.accentColor }} />
                    </div>
                    <div className="text-left">
                       <h3 className="text-5xl font-black tracking-tighter mb-2">Universal Transcode</h3>
                       <p className="text-white/20 text-2xl font-bold">Batch format transformation and optimization suite.</p>
                    </div>
                 </div>
                 <div className="mr-12 bg-white/5 p-6 rounded-full group-hover:bg-white/10 transition-all">
                    <ChevronRightIcon className="w-10 h-10 text-white/40 group-hover:text-white transition-all" />
                 </div>
              </div>
            </div>
          </div>
        )}

        {view === 'qr' && (
           <div className="py-20 flex flex-col items-center gap-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 max-w-4xl mx-auto">
              <div className="text-center space-y-6">
                 <QrCodeIcon className="w-20 h-20 mx-auto mb-6" style={{ color: settings.accentColor }} />
                 <h2 className="text-7xl font-black tracking-tighter">QR Matrix Engine</h2>
                 <p className="text-white/30 text-2xl font-medium">Transform your logical data into high-fidelity matrix images.</p>
              </div>
              <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/5 shadow-4xl space-y-10">
                 <input 
                   type="text" 
                   value={qrText} 
                   onChange={e => setQrText(e.target.value)} 
                   placeholder="Enter Data Source..." 
                   className="w-full bg-black border border-white/5 rounded-3xl p-8 text-2xl font-black outline-none focus:border-[#007aff] transition-all text-center tracking-tighter"
                 />
                 <button onClick={handleGenerateQR} className="w-full py-10 rounded-full text-black bg-white font-black text-xs uppercase tracking-[0.5em] shadow-2xl hover:bg-[#007aff] hover:text-white transition-all active:scale-95">Synthesize Matrix</button>
              </div>
              {qrImage && (
                <div className="flex flex-col items-center gap-10 p-10 bg-[#1c1c1e] rounded-[4rem] border border-white/10 shadow-4xl animate-in zoom-in-95 duration-500">
                   <img src={qrImage} className="w-full max-w-xs rounded-3xl shadow-3xl" alt="Generated QR" />
                   <div className="flex gap-4">
                      <a href={qrImage} download="Studio_QR.png" className="px-12 py-6 bg-white text-black rounded-full font-black text-[12px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Download</a>
                      <button onClick={importQRToStudio} className="px-12 py-6 rounded-full text-white font-black text-[12px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: settings.accentColor }}>Import to Editor</button>
                   </div>
                </div>
              )}
           </div>
        )}

        {view === 'format' && (
           <div className="py-12 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 max-w-6xl mx-auto">
              <div className="text-center space-y-4">
                 <ConvertIcon className="w-16 h-16 mx-auto mb-6" style={{ color: settings.accentColor }} />
                 <h2 className="text-6xl font-black tracking-tighter">Universal Lab</h2>
                 <p className="text-white/30 text-xl font-medium">Batch orchestration for asset transcoding.</p>
              </div>
              
              <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <Uploader onUpload={handleUpload} onUrlUpload={async (url) => {
                     const img = await imageService.loadImage(url);
                     const meta: ImageMetadata = { width: img.width, height: img.height, format: 'image/png', size: 0, originalSize: 0, name: 'Remote Asset' };
                     setProjects(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta, action: 'Imported' }], historyIndex: 0 }]);
                  }} />
                  
                  <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 space-y-6 max-h-[500px] overflow-y-auto no-scrollbar shadow-inner">
                    <div className="flex justify-between items-center mb-2 px-4">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Transcode Queue ({projects.length})</h3>
                       {projects.length > 0 && <button onClick={() => setProjects([])} className="text-[10px] font-black uppercase text-[#ff375f] tracking-widest hover:opacity-70 transition-opacity">Clear Orchestration</button>}
                    </div>
                    {projects.length === 0 ? (
                        <div className="py-32 text-center text-white/5 font-black uppercase tracking-[0.8em] italic">No Assets Loaded</div>
                    ) : (
                      <div className="space-y-4">
                         {projects.map((p, i) => (
                           <div key={p.id} className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                             <img src={p.url} className="w-16 h-16 rounded-xl object-cover shadow-2xl" />
                             <div className="flex-1 min-w-0">
                               <p className="text-lg font-black truncate tracking-tighter">{p.metadata.name}</p>
                               <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{(p.metadata.size / 1024).toFixed(1)} KB • {p.metadata.width}x{p.metadata.height}</p>
                             </div>
                             <button onClick={() => setProjects(prev => prev.filter((_, idx) => idx !== i))} className="p-3 opacity-0 group-hover:opacity-100 text-[#ff375f] transition-all hover:bg-[#ff375f]/10 rounded-full"><XIcon className="w-6 h-6" /></button>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-[#1c1c1e] p-10 rounded-[4rem] border border-white/5 shadow-4xl space-y-12">
                      <div className="space-y-6">
                         <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 px-3">Output Matrix</label>
                         <div className="grid grid-cols-1 gap-3">
                            {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                              <button 
                                key={fmt}
                                onClick={() => setLabFormat(fmt)}
                                className={`py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border flex items-center justify-between px-8 ${labFormat === fmt ? 'bg-white text-black border-white shadow-2xl' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                              >
                                {fmt.split('/')[1]}
                                {labFormat === fmt && <SparklesIcon className="w-4 h-4 text-black" />}
                              </button>
                            ))}
                         </div>
                      </div>

                      {labFormat !== 'image/png' && (
                        <div className="space-y-6">
                           <div className="flex justify-between px-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Quality Ratio</label>
                              <span className="text-[12px] font-black tabular-nums">{Math.round(labQuality * 100)}%</span>
                           </div>
                           <input type="range" min="0.1" max="1" step="0.05" value={labQuality} onChange={e => setLabQuality(parseFloat(e.target.value))} className="w-full" />
                        </div>
                      )}

                      <button 
                        onClick={handleBatchConvert}
                        disabled={projects.length === 0}
                        className="w-full py-10 rounded-full font-black uppercase text-[13px] tracking-[0.5em] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all disabled:opacity-10 hover:scale-[1.02] active:scale-95 text-white" 
                        style={{ backgroundColor: settings.accentColor }}
                      >
                         Execute Transcode
                      </button>
                   </div>

                   <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/5 text-center space-y-6 shadow-inner">
                      <InfoIcon className="w-10 h-10 mx-auto text-white/10" />
                      <p className="text-white/30 text-sm font-medium leading-relaxed px-4">Hardware accelerated synthesis. Original metadata preservation is enabled by default.</p>
                   </div>
                </div>
              </div>
           </div>
        )}

        {view === 'editor' && (
           <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-1000">
             {!activeProject ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-12 py-20">
                    <div className="text-center space-y-8 max-w-xl px-6">
                       <SparklesIcon className="w-24 h-24 mx-auto mb-10 transition-transform hover:rotate-12" style={{ color: settings.accentColor }} />
                       <h2 className="text-7xl font-black tracking-tighter">Studio Canvas</h2>
                       <p className="text-white/20 text-2xl font-medium leading-relaxed">Import a high-fidelity asset to begin the orchestration process.</p>
                    </div>
                    <Uploader onUpload={handleUpload} onUrlUpload={async (url) => {
                       const img = await imageService.loadImage(url);
                       const meta: ImageMetadata = { width: img.width, height: img.height, format: 'image/png', size: 0, originalSize: 0, name: 'Remote Asset' };
                       setProjects([{ id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta, action: 'Remote Import' }], historyIndex: 0 }]);
                       setActiveIndex(0);
                       setView('editor');
                    }} />
                </div>
             ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-10">
                   {/* Left Side: Preview and History */}
                   <div className="flex-1 flex flex-col gap-8 min-w-0">
                      <div className="relative flex-1 bg-[#0c0c0e] rounded-[5rem] border border-white/5 shadow-4xl flex items-center justify-center overflow-hidden group">
                         
                         {/* Control Overlays */}
                         <div className="absolute top-10 left-10 flex gap-4 z-30">
                            <button onClick={undoAction} disabled={activeProject.historyIndex === 0} className="p-4 bg-black/60 ios-blur border border-white/10 rounded-full disabled:opacity-10 hover:bg-white/10 transition-all"><UndoIcon className="w-6 h-6" /></button>
                            <button onClick={redoAction} disabled={activeProject.historyIndex === activeProject.history.length - 1} className="p-4 bg-black/60 ios-blur border border-white/10 rounded-full disabled:opacity-10 hover:bg-white/10 transition-all"><RedoIcon className="w-6 h-6" /></button>
                         </div>

                         <div className="absolute top-10 right-10 z-30">
                            <button 
                               onMouseDown={() => setShowOriginal(true)}
                               onMouseUp={() => setShowOriginal(false)}
                               onMouseLeave={() => setShowOriginal(false)}
                               className="px-8 py-4 bg-black/60 ios-blur border border-white/10 rounded-full flex items-center gap-3 transition-all hover:bg-white/10 active:scale-95 group/btn"
                            >
                               <EyeIcon className="w-5 h-5 opacity-40 group-hover/btn:opacity-100" />
                               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover/btn:text-white">Compare</span>
                            </button>
                         </div>

                         <div className="absolute top-28 right-10 z-30">
                            <button 
                               onClick={handleAutoEnhance}
                               className="px-10 py-6 bg-white/10 hover:bg-white/20 ios-blur border border-white/10 rounded-full flex items-center gap-5 transition-all shadow-4xl active:scale-95 group/magic"
                            >
                               <MagicWandIcon className="w-7 h-7 group-hover/magic:rotate-12 transition-transform" style={{ color: settings.accentColor }} />
                               <span className="text-[13px] font-black uppercase tracking-[0.4em] text-white">Neural Grade</span>
                            </button>
                         </div>

                         {/* Image View */}
                         <div className="relative transition-all duration-700" style={{ transform: `scale(${zoom})` }}>
                            <img src={showOriginal ? activeProject.history[0].url : activeProject.url} className="max-w-[80vw] max-h-[70vh] object-contain shadow-4xl rounded-[2rem] transition-opacity duration-300" alt="Canvas" />
                         </div>
                         
                         {/* Zoom Controls */}
                         <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/90 ios-blur border border-white/10 rounded-full p-4 px-10 shadow-4xl translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-4 hover:bg-white/10 rounded-full"><ZoomOutIcon className="w-7 h-7 text-white/50" /></button>
                            <span className="text-xl font-black w-24 text-center tabular-nums">{Math.round(zoom*100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(6, z + 0.2))} className="p-4 hover:bg-white/10 rounded-full"><ZoomInIcon className="w-7 h-7 text-white/50" /></button>
                         </div>

                         {/* History Path */}
                         <div className="absolute bottom-10 left-10 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {activeProject.history.slice(-5).map((h, i) => (
                               <div key={i} className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ios-blur border ${i === activeProject.history.slice(-5).length - 1 ? 'bg-white text-black' : 'bg-black/40 text-white/20 border-white/5'}`}>
                                  {h.action || 'Unknown'}
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* Thumbnails Bar */}
                      <div className="flex items-center gap-6 overflow-x-auto pb-6 no-scrollbar h-32 px-4">
                         <button onClick={() => {setView('home'); setActiveTool(null);}} className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105 active:scale-95"><XIcon className="w-8 h-8 opacity-20"/></button>
                         {projects.map((proj, idx) => (
                             <div 
                               key={proj.id} 
                               onClick={() => setActiveIndex(idx)}
                               className={`w-24 h-24 rounded-[2.5rem] flex-shrink-0 border-[4px] transition-all cursor-pointer overflow-hidden relative group ${activeIndex === idx ? 'scale-110 shadow-4xl border-white' : 'border-transparent opacity-40 hover:opacity-80'}`}
                             >
                                <img src={proj.url} className="w-full h-full object-cover" />
                                {activeIndex === idx && <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>}
                             </div>
                         ))}
                         <label className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 cursor-pointer hover:scale-105 transition-all">
                             <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                             <UploadIcon className="w-8 h-8 opacity-20" />
                         </label>
                      </div>
                   </div>

                   {/* Right Side: Inspector Panel */}
                   <div className="w-full lg:w-[450px] flex flex-col gap-8">
                      <div className="bg-[#1c1c1e] p-12 rounded-[5rem] border border-white/5 shadow-4xl space-y-12 h-[calc(100vh-400px)] flex flex-col overflow-hidden">
                         {activeTool ? (
                            <div className="animate-in slide-in-from-right-8 duration-700 space-y-12 flex-1 flex flex-col overflow-hidden">
                               <div className="flex items-center justify-between sticky top-0 bg-[#1c1c1e] z-10 py-2 border-b border-white/5">
                                  <div className="flex flex-col">
                                     <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: settings.accentColor }}>{activeTool}</h3>
                                     <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20">Studio Inspector</span>
                                  </div>
                                  <button onClick={() => setActiveTool(null)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5"><XIcon className="w-6 h-6 opacity-40" /></button>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto no-scrollbar space-y-12 pb-20">
                                  {activeTool === ToolType.ADJUST && (
                                     <div className="space-y-14">
                                        <div className="space-y-10">
                                           {[
                                             {l:'Exposure', v:brightness, s:setBrightness, min:0, max:200}, 
                                             {l:'Contrast', v:contrast, s:setContrast, min:0, max:200}, 
                                             {l:'Saturate', v:saturate, s:setSaturate, min:0, max:200}
                                           ].map(a => (
                                              <div key={a.l} className="space-y-6">
                                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.4em] text-white/30 px-2">
                                                    <span>{a.l}</span>
                                                    <span className="text-white tabular-nums">{a.v}%</span>
                                                 </div>
                                                 <input type="range" min={a.min} max={a.max} value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                                              </div>
                                           ))}
                                        </div>
                                        <button onClick={() => applyAction((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Adjust Levels')} className="w-full py-10 rounded-full bg-white text-black font-black uppercase text-[12px] tracking-[0.4em] shadow-4xl transition-all hover:bg-[#007aff] hover:text-white active:scale-95">Synthesize Adjustments</button>
                                     </div>
                                  )}
                                  
                                  {activeTool === ToolType.FILTER && (
                                     <div className="space-y-10">
                                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 sticky top-0 bg-[#1c1c1e] z-10">
                                           {Object.keys(filterSets).map(cat => (
                                              <button 
                                                 key={cat} 
                                                 onClick={() => setFilterCategory(cat as any)}
                                                 className={`whitespace-nowrap px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${filterCategory === cat ? 'bg-white text-black shadow-xl border-white' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                              >
                                                 {cat}
                                              </button>
                                           ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 px-2">
                                           {filterSets[filterCategory].map(p => (
                                              <button key={p.name} onClick={() => applyAction((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col gap-5 group text-left">
                                                 <div className="aspect-square rounded-[2.5rem] overflow-hidden border border-white/5 group-hover:scale-105 transition-all shadow-xl relative">
                                                    <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                       <SparklesIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                 </div>
                                                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-white ml-2 transition-colors">{p.name}</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                  )}

                                  {activeTool === ToolType.CROP && (
                                     <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-4">
                                           {[
                                              {n: 'Square', r: '1:1', w: 1, h: 1},
                                              {n: 'Classic', r: '4:3', w: 4, h: 3},
                                              {n: 'HD', r: '16:9', w: 16, h: 9},
                                              {n: 'Portrait', r: '9:16', w: 9, h: 16}
                                           ].map(r => (
                                              <button key={r.r} onClick={() => {
                                                 const targetW = activeProject.metadata.width;
                                                 const targetH = Math.round((targetW / r.w) * r.h);
                                                 applyAction((img) => imageService.cropImage(img, 0, 0, targetW, Math.min(targetH, activeProject.metadata.height)), `Crop ${r.r}`);
                                              }} className="p-8 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all flex flex-col items-center gap-4 text-center">
                                                 <div className="border border-white/20 rounded opacity-40" style={{ width: 40, height: 40 * (r.h/r.w) }}></div>
                                                 <span className="text-[10px] font-black uppercase tracking-widest">{r.n}</span>
                                                 <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{r.r}</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                  )}

                                  {activeTool === ToolType.RESIZE && (
                                     <div className="space-y-12">
                                        <div className="grid grid-cols-2 gap-8">
                                           <div className="space-y-4">
                                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 px-3">Width</label>
                                              <input value={resizeW} onChange={e => setResizeW(e.target.value)} className="w-full bg-black border border-white/5 rounded-3xl p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-all tracking-tighter tabular-nums" />
                                           </div>
                                           <div className="space-y-4">
                                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 px-3">Height</label>
                                              <input value={resizeH} onChange={e => setResizeH(e.target.value)} className="w-full bg-black border border-white/5 rounded-3xl p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-all tracking-tighter tabular-nums" />
                                           </div>
                                        </div>
                                        <button onClick={() => applyAction((img) => imageService.resizeImage(img, parseInt(resizeW), parseInt(resizeH)), 'Rescale Asset')} className="w-full py-10 rounded-full bg-white text-black font-black uppercase text-[12px] tracking-[0.4em] shadow-4xl hover:bg-[#007aff] hover:text-white transition-all">Execute Rescale</button>
                                     </div>
                                  )}

                                  {/* Additional tools here... mirroring current UI but refined */}
                                  {activeTool === ToolType.ROTATE && (
                                     <div className="flex flex-col gap-8 items-center py-10">
                                        <div className="flex gap-8">
                                           <button onClick={() => applyAction((img) => imageService.rotateImage(img, -90), 'Rotate CCW')} className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-white/10 border border-white/5 transition-all">
                                              <RotateIcon className="w-10 h-10 text-white -scale-x-100" />
                                              <span className="text-[10px] font-black uppercase tracking-widest">-90°</span>
                                           </button>
                                           <button onClick={() => applyAction((img) => imageService.rotateImage(img, 90), 'Rotate CW')} className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-white/10 border border-white/5 transition-all">
                                              <RotateIcon className="w-10 h-10 text-white" />
                                              <span className="text-[10px] font-black uppercase tracking-widest">+90°</span>
                                           </button>
                                        </div>
                                     </div>
                                  )}
                               </div>
                            </div>
                         ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-14 px-10">
                               <div className="w-36 h-36 bg-white/5 rounded-[4rem] flex items-center justify-center border border-white/5 shadow-[inset_0_4px_12px_rgba(255,255,255,0.05)] animate-float">
                                  <AdjustmentsIcon className="w-16 h-16 opacity-10" />
                                </div>
                               <div className="space-y-6">
                                  <h4 className="font-black uppercase tracking-[0.6em] text-[14px] text-white/40">Studio Dashboard</h4>
                                  <p className="text-white/20 text-xl font-medium leading-relaxed">Select a functional logic from the floating controller to begin asset orchestration.</p>
                               </div>
                               <div className="flex gap-4 opacity-20">
                                  <div className="w-2 h-2 rounded-full bg-white animate-pulse delay-75"></div>
                                  <div className="w-2 h-2 rounded-full bg-white animate-pulse delay-150"></div>
                                  <div className="w-2 h-2 rounded-full bg-white animate-pulse delay-300"></div>
                               </div>
                            </div>
                         )}
                      </div>
                      
                      {/* File Info Card */}
                      <div className="bg-[#1c1c1e] p-10 rounded-[4rem] border border-white/5 shadow-4xl flex items-center justify-between transition-all hover:bg-[#252528]">
                         <div className="min-w-0">
                            <h3 className="text-2xl font-black truncate mb-3 tracking-tighter">{activeProject.metadata.name}</h3>
                            <div className="flex gap-4">
                               <span className="text-[10px] font-black px-5 py-2.5 bg-white/5 rounded-full text-white/20 border border-white/5 tabular-nums">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                               <span className="text-[10px] font-black px-5 py-2.5 rounded-full shadow-2xl border border-white/5 tabular-nums" style={{ color: settings.accentColor, backgroundColor: `${settings.accentColor}10` }}>{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                         </div>
                         <a href={activeProject.url} download={`Studio_${activeProject.metadata.name}`} className="bg-white text-black px-12 py-6 rounded-full text-[12px] font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-[#007aff] hover:text-white transition-all active:scale-95">Export</a>
                      </div>
                   </div>
                </div>
             )}
           </div>
        )}

        {view === 'settings' && (
           <div className="py-20 max-w-4xl mx-auto animate-in slide-in-from-bottom-12 duration-1000">
              <h2 className="text-7xl font-black tracking-tighter mb-20 text-center">Studio Logic</h2>
              <div className="bg-[#1c1c1e] p-16 rounded-[5rem] border border-white/5 shadow-4xl space-y-16">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                       <label className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-3">Studio Alias</label>
                       <input value={settings.title} onChange={e => setSettings({...settings, title: e.target.value})} className="w-full bg-black border border-white/5 rounded-3xl p-8 text-2xl font-black outline-none focus:border-[#007aff] transition-all tracking-tighter" />
                    </div>
                    <div className="space-y-6">
                       <label className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-3">Brand Signature</label>
                       <div className="flex gap-6">
                          <input type="color" value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="w-24 h-24 bg-transparent rounded-3xl cursor-pointer border-0 shadow-2xl overflow-hidden active:scale-90 transition-transform" />
                          <input value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="flex-1 bg-black border border-white/5 rounded-3xl p-8 text-2xl font-black outline-none font-mono" />
                       </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                       {l: 'Uploads', v: '142'},
                       {l: 'Ops', v: '891'},
                       {l: 'Node', v: 'v5.5'},
                       {l: 'Sync', v: 'Active'}
                    ].map(s => (
                       <div key={s.l} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 text-center">
                          <p className="text-[10px] font-black text-white/20 uppercase mb-4 tracking-widest">{s.l}</p>
                          <p className="text-4xl font-black tracking-tighter" style={{ color: settings.accentColor }}>{s.v}</p>
                       </div>
                    ))}
                 </div>

                 <button onClick={() => setView('home')} className="w-full py-10 rounded-full text-white font-black uppercase text-sm tracking-[0.6em] shadow-4xl transition-all hover:scale-[1.01] active:scale-95" style={{ backgroundColor: settings.accentColor }}>Commit Config Changes</button>
              </div>
           </div>
        )}

      </main>

      <footer className="w-full py-48 px-12 border-t border-white/5 bg-black relative mt-auto z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start justify-between gap-32">
          <div className="flex flex-col items-start gap-12 max-w-xl">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-4xl animate-float" style={{ backgroundColor: settings.accentColor }}><SparklesIcon className="text-white w-8 h-8" /></div>
                <h4 className="text-5xl font-black tracking-tighter uppercase">{settings.title}</h4>
             </div>
             <p className="text-white/20 font-medium leading-relaxed text-2xl pr-12">The high-fidelity orchestration suite for modern imaging studios. Engineered for precision, synthesized for visual inspiration.</p>
             <p className="text-[11px] font-black uppercase tracking-[0.8em] text-white/5 pt-12">{settings.footerCopyright}</p>
          </div>
          <div className="flex items-center gap-12 bg-white/[0.03] p-12 rounded-[5rem] border border-white/5 shadow-3xl hover:bg-white/5 transition-colors cursor-pointer group">
             <div className="text-right">
                <span className="block text-5xl font-black tracking-tighter transition-transform group-hover:-translate-x-2">{settings.programmerName}</span>
                <span className="block text-[13px] font-black uppercase tracking-[0.5em] text-white/20 mt-4">{settings.programmerRole}</span>
             </div>
             <div className="w-28 h-28 rounded-[3rem] border border-white/10 overflow-hidden shadow-4xl transition-transform group-hover:scale-105"><img src={settings.programmerImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Executive" /></div>
          </div>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}
