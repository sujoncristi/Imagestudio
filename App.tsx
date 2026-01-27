
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
  footerCopyright: "© 2024 IMAGERIZE STUDIO • CORE v5.2",
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
      return { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 };
    }));
    setProjects(prev => [...prev, ...newProjects]);
    setActiveIndex(projects.length);
    // If we are in home or format view, stay where we are if appropriate, 
    // but usually users expect to go to editor.
    // Except in Format view, where we want to keep them in the Lab.
    if (view !== 'format') {
        setView('editor');
    }
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
    } catch (e) {
      alert("Conversion failed.");
    } finally { endTask(); }
  };

  const handleAutoEnhance = async () => {
    if (!activeProject) return;
    startTask('Neural Deep Scan...');
    try {
      const img = await imageService.loadImage(activeProject.url);
      const analysisJson = await geminiService.analyzeImage(activeProject.url, activeProject.metadata.format);
      const analysis = JSON.parse(analysisJson);
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
    } catch (e) {
      const img = await imageService.loadImage(activeProject.url);
      const url = await imageService.applyFilter(img, 'brightness(1.1) contrast(1.1) saturate(1.1)');
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      const newHistory = [...activeProject.history, { url, metadata: { ...activeProject.metadata, size: blob.size }, action: 'Auto Enhance' }];
      const newProjects = [...projects];
      newProjects[activeIndex] = { ...activeProject, url, history: newHistory, historyIndex: newHistory.length - 1 };
      setProjects(newProjects);
    } finally { endTask(); }
  };

  const handleGenerateQR = () => {
    if (!qrText) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrText)}`;
    setQrImage(url);
  };

  const importQRToStudio = async () => {
    startTask('Importing QR...');
    try {
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: blob.type,
        size: blob.size, originalSize: blob.size, name: `QR_Code.png`
      };
      const proj: ProjectImage = { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 };
      setProjects(p => [...p, proj]);
      setActiveIndex(projects.length);
      setView('editor');
      setQrImage('');
    } finally { endTask(); }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30">
      
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: settings.accentColor }}></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: '#af52de' }}></div>
      </div>

      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-10">
            <div className="w-20 h-20 border-[6px] border-white/5 border-t-white rounded-full animate-spin"></div>
            <p className="font-black text-3xl tracking-[0.5em] uppercase text-white">{loadingMessage}</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/40 ios-blur border-b border-white/5 px-8 md:px-16 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setView('home'); setActiveTool(null);}}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: settings.accentColor }}>
            <SparklesIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">{settings.title}</h1>
        </div>
        <div className="flex gap-4">
           {view !== 'home' && <button onClick={() => setView('home')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all"><XIcon className="w-6 h-6 text-white/40" /></button>}
           <button onClick={() => setView('settings')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all"><SettingsIcon className="w-6 h-6 text-white/40" /></button>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1500px] mx-auto p-6 md:p-12 overflow-hidden">
        
        {view === 'home' && (
          <div className="animate-in fade-in duration-700">
            <HeroVisual accentColor={settings.accentColor} />
            <div className="text-center space-y-8 mb-32">
              <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8]">{settings.heroHeadline}<br/><span style={{ color: settings.accentColor }}>{settings.heroSubheadline}</span></h2>
              <p className="text-white/40 text-2xl font-medium max-w-2xl mx-auto">{settings.heroDescription}</p>
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
                <p className="text-white/30 text-2xl font-bold max-w-md">The professional-grade non-destructive editor for visual assets.</p>
                <div className="mt-10 bg-white text-black px-10 py-5 rounded-full text-xs font-black uppercase tracking-widest inline-block w-fit group-hover:bg-[#007aff] group-hover:text-white transition-colors shadow-2xl">Enter Workspace</div>
              </div>

              <div 
                className="md:col-span-4 group relative p-12 bg-gradient-to-br from-[#af52de]/30 to-[#ff375f]/30 rounded-[4rem] border border-white/10 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all flex flex-col items-center text-center min-h-[500px]"
                onClick={() => { setView('editor'); setActiveTool(ToolType.CROP); }}
              >
                <div className="w-20 h-20 bg-white/20 ios-blur rounded-3xl flex items-center justify-center mb-auto border border-white/5">
                  <CropIcon className="w-10 h-10 text-white" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-4xl font-black tracking-tighter mb-4 transition-transform group-hover:-translate-y-1">Smart Crop</h3>
                  <p className="text-white/80 text-xl font-bold">Intelligent reframing for standard compositions.</p>
                </div>
              </div>

              <div 
                className="md:col-span-4 group relative p-12 bg-white/5 rounded-[4rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all flex flex-col items-center text-center min-h-[400px]"
                onClick={() => { setView('editor'); handleAutoEnhance(); }}
              >
                 <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-8 border border-white/5 group-hover:bg-[#007aff]/20 transition-colors">
                    <MagicWandIcon className="w-10 h-10 text-white" style={{ color: settings.accentColor }} />
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter mb-4">Neural Grade</h3>
                 <p className="text-white/30 text-xl font-bold">AI-driven auto-enhancement for perfect levels.</p>
              </div>

              <div 
                className="md:col-span-8 group relative p-12 bg-[#1c1c1e] rounded-[4rem] border border-white/5 shadow-3xl cursor-pointer hover:scale-[1.01] transition-all flex flex-col md:flex-row items-center justify-between min-h-[400px] overflow-hidden"
                onClick={() => setView('format')}
              >
                <div className="flex items-center gap-10">
                   <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 group-hover:bg-[#007aff]/20 transition-colors">
                      <ConvertIcon className="w-12 h-12" style={{ color: settings.accentColor }} />
                   </div>
                   <div className="text-left">
                      <h3 className="text-4xl font-black tracking-tighter mb-2">Universal Converter</h3>
                      <p className="text-white/20 text-xl font-bold">Batch transcode and compress imaging assets.</p>
                   </div>
                </div>
                <div className="bg-white text-black px-12 py-5 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all group-hover:bg-[#007aff] group-hover:text-white">Format Logic</div>
              </div>

            </div>
          </div>
        )}

        {view === 'qr' && (
           <div className="py-20 flex flex-col items-center gap-16 animate-in fade-in duration-700 max-w-4xl mx-auto">
              <div className="text-center space-y-6">
                 <QrCodeIcon className="w-20 h-20 mx-auto mb-6" style={{ color: settings.accentColor }} />
                 <h2 className="text-6xl font-black tracking-tighter">QR Matrix Engine</h2>
                 <p className="text-white/30 text-2xl font-medium">Input your logic below to generate a high-fidelity QR Code.</p>
              </div>
              <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/5 shadow-4xl space-y-10">
                 <input 
                   type="text" 
                   value={qrText} 
                   onChange={e => setQrText(e.target.value)} 
                   placeholder="Enter URL or Text..." 
                   className="w-full bg-black border border-white/5 rounded-3xl p-8 text-2xl font-black outline-none focus:border-[#007aff] transition-all"
                 />
                 <button onClick={handleGenerateQR} className="w-full py-8 rounded-full text-black bg-white font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#007aff] hover:text-white transition-all">Generate QR Matrix</button>
              </div>
              {qrImage && (
                <div className="flex flex-col items-center gap-10 p-10 bg-[#1c1c1e] rounded-[4rem] border border-white/10 shadow-4xl animate-in zoom-in-95 duration-500">
                   <img src={qrImage} className="w-full max-w-xs rounded-3xl shadow-3xl" alt="Generated QR" />
                   <div className="flex gap-4">
                      <a href={qrImage} download="Studio_QR.png" className="px-10 py-5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105">Download</a>
                      <button onClick={importQRToStudio} className="px-10 py-5 rounded-full text-white font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105" style={{ backgroundColor: settings.accentColor }}>Import to Editor</button>
                   </div>
                </div>
              )}
           </div>
        )}

        {view === 'format' && (
           <div className="py-12 flex flex-col items-center gap-12 animate-in fade-in duration-700 max-w-6xl mx-auto">
              <div className="text-center space-y-4">
                 <ConvertIcon className="w-16 h-16 mx-auto mb-6" style={{ color: settings.accentColor }} />
                 <h2 className="text-5xl font-black tracking-tighter">Universal Lab</h2>
                 <p className="text-white/30 text-xl font-medium">High-fidelity batch transcoding suite.</p>
              </div>
              
              <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Uploader Column */}
                <div className="lg:col-span-2 space-y-8">
                  <Uploader onUpload={handleUpload} onUrlUpload={async (url) => {
                     const img = await imageService.loadImage(url);
                     const meta: ImageMetadata = { width: img.width, height: img.height, format: 'image/png', size: 0, originalSize: 0, name: 'Remote Asset' };
                     setProjects(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 }]);
                  }} />
                  
                  {/* File List */}
                  <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 space-y-6 max-h-[500px] overflow-y-auto no-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                       <h3 className="text-sm font-black uppercase tracking-widest text-white/40">Queue ({projects.length})</h3>
                       {projects.length > 0 && <button onClick={() => setProjects([])} className="text-[10px] font-black uppercase text-[#ff375f] tracking-widest">Clear All</button>}
                    </div>
                    {projects.length === 0 ? (
                        <div className="py-20 text-center text-white/10 font-black uppercase tracking-widest italic">Wait-state: Empty</div>
                    ) : (
                      <div className="space-y-4">
                         {projects.map((p, i) => (
                           <div key={p.id} className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/5 group">
                             <img src={p.url} className="w-14 h-14 rounded-lg object-cover" />
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold truncate">{p.metadata.name}</p>
                               <p className="text-[10px] text-white/20 font-black uppercase tracking-tighter">{(p.metadata.size / 1024).toFixed(1)} KB • {p.metadata.width}x{p.metadata.height}</p>
                             </div>
                             <button onClick={() => setProjects(prev => prev.filter((_, idx) => idx !== i))} className="p-2 opacity-0 group-hover:opacity-100 text-[#ff375f] transition-all"><XIcon className="w-5 h-5" /></button>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings Column */}
                <div className="space-y-8">
                   <div className="bg-[#1c1c1e] p-10 rounded-[4rem] border border-white/5 shadow-4xl space-y-10">
                      <div className="space-y-4">
                         <label className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20 px-3">Target Matrix</label>
                         <div className="grid grid-cols-3 gap-3">
                            {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                              <button 
                                key={fmt}
                                onClick={() => setLabFormat(fmt)}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${labFormat === fmt ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'}`}
                              >
                                {fmt.split('/')[1]}
                              </button>
                            ))}
                         </div>
                      </div>

                      {labFormat !== 'image/png' && (
                        <div className="space-y-4">
                           <div className="flex justify-between px-3">
                              <label className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Compression</label>
                              <span className="text-[11px] font-black tabular-nums">{Math.round(labQuality * 100)}%</span>
                           </div>
                           <input type="range" min="0.1" max="1" step="0.05" value={labQuality} onChange={e => setLabQuality(parseFloat(e.target.value))} className="w-full" />
                        </div>
                      )}

                      <button 
                        onClick={handleBatchConvert}
                        disabled={projects.length === 0}
                        className="w-full py-8 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-4xl transition-all disabled:opacity-20 hover:scale-[1.02] active:scale-95 text-white" 
                        style={{ backgroundColor: settings.accentColor }}
                      >
                         Process Batch
                      </button>
                   </div>

                   <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 text-center space-y-4">
                      <InfoIcon className="w-8 h-8 mx-auto text-white/10" />
                      <p className="text-white/20 text-xs font-bold leading-relaxed px-4">Direct hardware-accelerated transcoding. Metadata is preserved where applicable.</p>
                   </div>
                </div>
              </div>
           </div>
        )}

        {view === 'editor' && (
           <div className="h-full flex flex-col animate-in fade-in duration-700">
             {!activeProject ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-12 py-20">
                    <SparklesIcon className="w-20 h-20 mx-auto mb-10" style={{ color: settings.accentColor }} />
                    <h2 className="text-6xl font-black tracking-tighter">Studio Canvas</h2>
                    <Uploader onUpload={handleUpload} onUrlUpload={async (url) => {
                       const img = await imageService.loadImage(url);
                       const meta: ImageMetadata = { width: img.width, height: img.height, format: 'image/png', size: 0, originalSize: 0, name: 'Remote Asset' };
                       setProjects([{ id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 }]);
                       setActiveIndex(0);
                       setView('editor');
                    }} />
                </div>
             ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-10">
                   <div className="flex-1 flex flex-col gap-8">
                      {/* PREVIEW CONTAINER */}
                      <div className="relative flex-1 bg-[#0c0c0e] rounded-[5rem] border border-white/5 shadow-4xl flex items-center justify-center overflow-hidden group">
                         
                         {/* AUTO ENHANCE OVERLAY BUTTON */}
                         <div className="absolute top-10 right-10 z-30">
                            <button 
                               onClick={handleAutoEnhance}
                               className="px-12 py-6 bg-white/10 hover:bg-white/20 ios-blur border border-white/10 rounded-full flex items-center gap-5 transition-all shadow-4xl active:scale-95 group/btn"
                            >
                               <MagicWandIcon className="w-8 h-8 group-hover/btn:rotate-12 transition-transform" style={{ color: settings.accentColor }} />
                               <span className="text-[14px] font-black uppercase tracking-[0.4em] text-white">Neural Grade</span>
                            </button>
                         </div>

                         <div className="relative transition-all duration-700" style={{ transform: `scale(${zoom})` }}>
                            <img src={activeProject.url} className="max-w-[80vw] max-h-[70vh] object-contain shadow-4xl rounded-[2rem]" alt="Canvas Asset" />
                         </div>
                         
                         <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/90 ios-blur border border-white/10 rounded-full p-4 px-10 shadow-4xl translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-4 hover:bg-white/10 rounded-full"><ZoomOutIcon className="w-7 h-7 text-white/50" /></button>
                            <span className="text-xl font-black w-20 text-center tabular-nums">{Math.round(zoom*100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(6, z + 0.2))} className="p-4 hover:bg-white/10 rounded-full"><ZoomInIcon className="w-7 h-7 text-white/50" /></button>
                         </div>
                      </div>

                      {/* THUMBNAILS BAR */}
                      <div className="flex items-center gap-6 overflow-x-auto pb-6 no-scrollbar">
                         <button onClick={() => {setView('home'); setActiveTool(null);}} className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all"><XIcon className="w-8 h-8 opacity-40"/></button>
                         {projects.map((proj, idx) => (
                             <div 
                               key={proj.id} 
                               onClick={() => setActiveIndex(idx)}
                               className={`w-24 h-24 rounded-[3rem] flex-shrink-0 border-[4px] transition-all cursor-pointer overflow-hidden ${activeIndex === idx ? 'scale-110 shadow-4xl border-white' : 'border-transparent opacity-40 hover:opacity-100'}`}
                             >
                                <img src={proj.url} className="w-full h-full object-cover" />
                             </div>
                         ))}
                         <label className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 cursor-pointer">
                             <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                             <UploadIcon className="w-8 h-8 opacity-40" />
                         </label>
                      </div>
                   </div>

                   {/* CONTROL PANEL */}
                   <div className="w-full lg:w-[450px] flex flex-col gap-8">
                      <div className="bg-[#1c1c1e] p-12 rounded-[5rem] border border-white/5 shadow-4xl space-y-12 h-full flex flex-col overflow-y-auto no-scrollbar">
                         {activeTool ? (
                            <div className="animate-in slide-in-from-right-8 duration-700 space-y-10 flex-1">
                               <div className="flex items-center justify-between sticky top-0 bg-[#1c1c1e] z-10 py-2 border-b border-white/5">
                                  <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: settings.accentColor }}>{activeTool}</h3>
                                  <button onClick={() => setActiveTool(null)} className="p-4 bg-white/5 rounded-full"><XIcon className="w-6 h-6 opacity-40" /></button>
                               </div>
                               
                               {activeTool === ToolType.ADJUST && (
                                  <div className="space-y-12">
                                     <button onClick={handleAutoEnhance} className="w-full py-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center gap-5 hover:bg-white/10 transition-all group/magic">
                                        <MagicWandIcon className="w-6 h-6 group-hover/magic:scale-110 transition-transform" style={{ color: settings.accentColor }} />
                                        <span className="text-[12px] font-black uppercase tracking-widest">Neural Auto Polish</span>
                                     </button>
                                     <div className="space-y-10">
                                        {[
                                          {l:'Exposure', v:brightness, s:setBrightness}, 
                                          {l:'Contrast', v:contrast, s:setContrast}, 
                                          {l:'Saturate', v:saturate, s:setSaturate}
                                        ].map(a => (
                                           <div key={a.l} className="space-y-5">
                                              <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.4em] text-white/30">
                                                 <span>{a.l}</span>
                                                 <span className="text-white tabular-nums">{a.v}%</span>
                                              </div>
                                              <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                                           </div>
                                        ))}
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Precision Adjustment')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Apply Adjustments</button>
                                  </div>
                               )}
                               
                               {activeTool === ToolType.FILTER && (
                                  <div className="space-y-10">
                                     <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-4 border-b border-white/5">
                                        {Object.keys(filterSets).map(cat => (
                                           <button 
                                              key={cat} 
                                              onClick={() => setFilterCategory(cat as any)}
                                              className={`whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40'}`}
                                           >
                                              {cat}
                                           </button>
                                        ))}
                                     </div>
                                     <div className="grid grid-cols-2 gap-6 pb-20">
                                        {filterSets[filterCategory].map(p => (
                                           <button key={p.name} onClick={() => applyAction((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col gap-5 group text-left">
                                              <div className="aspect-square rounded-[2rem] overflow-hidden border border-white/5 group-hover:scale-105 transition-all shadow-xl">
                                                 <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                              </div>
                                              <span className="text-[11px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">{p.name}</span>
                                           </button>
                                        ))}
                                     </div>
                                  </div>
                               )}

                               {activeTool === ToolType.RESIZE && (
                                  <div className="space-y-10">
                                     <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                           <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Width</label>
                                           <input value={resizeW} onChange={e => setResizeW(e.target.value)} className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/20" />
                                        </div>
                                        <div className="space-y-3">
                                           <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Height</label>
                                           <input value={resizeH} onChange={e => setResizeH(e.target.value)} className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/20" />
                                        </div>
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.resizeImage(img, parseInt(resizeW), parseInt(resizeH)), 'Resize')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Execute Rescale</button>
                                  </div>
                               )}

                               {activeTool === ToolType.ROTATE && (
                                  <div className="flex justify-center py-10">
                                     <button onClick={() => applyAction((img) => imageService.rotateImage(img, 90), 'Rotate CW')} className="w-32 h-32 bg-white/5 rounded-full flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-all border border-white/5">
                                        <RotateIcon className="w-10 h-10 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">+90°</span>
                                     </button>
                                  </div>
                               )}

                               {activeTool === ToolType.MIRROR && (
                                  <div className="grid grid-cols-2 gap-6">
                                     <button onClick={() => applyAction((img) => imageService.flipImage(img, 'horizontal'), 'Flip Horizontal')} className="py-10 bg-white/5 rounded-3xl flex flex-col items-center gap-4 hover:bg-white/10 border border-white/5">
                                        <MirrorIcon className="w-8 h-8 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Horizontal</span>
                                     </button>
                                     <button onClick={() => applyAction((img) => imageService.flipImage(img, 'vertical'), 'Flip Vertical')} className="py-10 bg-white/5 rounded-3xl flex flex-col items-center gap-4 hover:bg-white/10 border border-white/5">
                                        <MirrorIcon className="w-8 h-8 text-white rotate-90" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Vertical</span>
                                     </button>
                                  </div>
                               )}

                               {activeTool === ToolType.COMPRESS && (
                                  <div className="space-y-10">
                                     <div className="space-y-5">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/30">
                                           <span>Quality</span>
                                           <span className="text-white">{Math.round(compressQuality * 100)}%</span>
                                        </div>
                                        <input type="range" min="0.1" max="1" step="0.05" value={compressQuality} onChange={e => setCompressQuality(parseFloat(e.target.value))} className="w-full" />
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.compressImage(img, compressQuality), 'Optimize')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Minimize Asset</button>
                                  </div>
                               )}

                               {activeTool === ToolType.PIXELATE && (
                                  <div className="space-y-10">
                                     <div className="space-y-5">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/30">
                                           <span>Block Scale</span>
                                           <span className="text-white">{(pixelScale * 100).toFixed(1)}%</span>
                                        </div>
                                        <input type="range" min="0.01" max="0.3" step="0.01" value={pixelScale} onChange={e => setPixelScale(parseFloat(e.target.value))} className="w-full" />
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.pixelateImage(img, pixelScale), '8-Bit Render')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Render Pixels</button>
                                  </div>
                               )}

                               {activeTool === ToolType.GRAIN && (
                                  <div className="space-y-10">
                                     <div className="space-y-5">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/30">
                                           <span>Film Grain</span>
                                           <span className="text-white">{grainAmount}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={grainAmount} onChange={e => setGrainAmount(parseInt(e.target.value))} className="w-full" />
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.addGrain(img, grainAmount), 'Analog Polish')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Apply Noise</button>
                                  </div>
                               )}

                               {activeTool === ToolType.BORDER && (
                                  <div className="space-y-10">
                                     <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                           <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Color</label>
                                           <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-full h-14 bg-transparent border-0 rounded-2xl cursor-pointer" />
                                        </div>
                                        <div className="space-y-3">
                                           <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Thickness</label>
                                           <input type="number" value={borderSize} onChange={e => setBorderSize(parseInt(e.target.value))} className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xl font-black outline-none" />
                                        </div>
                                     </div>
                                     <button onClick={() => applyAction((img) => imageService.addBorder(img, borderColor, borderSize), 'Studio Border')} className="w-full py-8 rounded-[2.5rem] bg-white text-black font-black uppercase text-xs tracking-widest">Add Frame</button>
                                  </div>
                               )}

                               {activeTool === ToolType.BW && (
                                  <div className="flex flex-col gap-6">
                                     <button onClick={() => applyAction((img) => imageService.grayscaleImage(img), 'Mono Classic')} className="w-full py-10 bg-white/5 rounded-3xl font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/5 transition-all">Classic Monochrome</button>
                                     <button onClick={() => applyAction((img) => imageService.applyFilter(img, 'grayscale(100%) contrast(1.8)'), 'Mono High Contrast')} className="w-full py-10 bg-white/5 rounded-3xl font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/5 transition-all">High Contrast Noir</button>
                                  </div>
                               )}
                            </div>
                         ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-12">
                               <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/5 shadow-inner">
                                  <AdjustmentsIcon className="w-14 h-14 opacity-10" />
                                </div>
                               <div className="space-y-6">
                                  <h4 className="font-black uppercase tracking-[0.5em] text-[13px] text-white/40">Studio Interaction</h4>
                                  <p className="text-white/20 text-lg font-medium px-16 leading-relaxed">Select a logic engine from the floating toolbar to begin orchestrating your asset.</p>
                               </div>
                            </div>
                         )}
                      </div>
                      
                      <div className="bg-[#1c1c1e] p-10 rounded-[4rem] border border-white/5 shadow-4xl flex items-center justify-between">
                         <div className="min-w-0">
                            <h3 className="text-2xl font-black truncate mb-2">{activeProject.metadata.name}</h3>
                            <div className="flex gap-4">
                               <span className="text-[10px] font-black px-4 py-2 bg-white/5 rounded-full text-white/20">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                               <span className="text-[10px] font-black px-4 py-2 rounded-full shadow-2xl" style={{ color: settings.accentColor, backgroundColor: `${settings.accentColor}10` }}>{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                         </div>
                         <a href={activeProject.url} download={`studio_${activeProject.metadata.name}`} className="bg-white text-black px-12 py-6 rounded-full text-[12px] font-black uppercase tracking-widest shadow-4xl hover:bg-[#007aff] hover:text-white transition-all">Export</a>
                      </div>
                   </div>
                </div>
             )}
           </div>
        )}

        {view === 'settings' && (
           <div className="py-20 max-w-4xl mx-auto animate-in slide-in-from-bottom-12 duration-700">
              <h2 className="text-6xl font-black tracking-tighter mb-16">Studio Configuration</h2>
              <div className="bg-[#1c1c1e] p-14 rounded-[4rem] border border-white/5 shadow-4xl space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-5">
                       <label className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-3">Suite Identity</label>
                       <input value={settings.title} onChange={e => setSettings({...settings, title: e.target.value})} className="w-full bg-black border border-white/5 rounded-3xl p-7 text-xl font-black outline-none focus:border-[#007aff] transition-all" />
                    </div>
                    <div className="space-y-5">
                       <label className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 px-3">Accent Signature</label>
                       <div className="flex gap-5">
                          <input type="color" value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="w-20 h-20 bg-transparent rounded-3xl cursor-pointer border-0 shadow-2xl overflow-hidden" />
                          <input value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="flex-1 bg-black border border-white/5 rounded-3xl p-7 text-xl font-black outline-none font-mono" />
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setView('home')} className="w-full py-8 rounded-full text-white font-black uppercase text-xs tracking-widest shadow-4xl transition-all hover:scale-[1.01]" style={{ backgroundColor: settings.accentColor }}>Sync Engine Changes</button>
              </div>
           </div>
        )}

      </main>

      <footer className="w-full py-40 px-12 border-t border-white/5 bg-black relative mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start justify-between gap-32">
          <div className="flex flex-col items-start gap-10 max-w-md">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-4xl" style={{ backgroundColor: settings.accentColor }}><SparklesIcon className="text-white w-7 h-7" /></div>
                <h4 className="text-4xl font-black tracking-tighter uppercase">{settings.title}</h4>
             </div>
             <p className="text-white/20 font-medium leading-relaxed text-xl">The precision suite for modern imaging studios. Engineered for high-fidelity orchestration, designed for visual inspiration.</p>
             <p className="text-[11px] font-black uppercase tracking-[0.7em] text-white/10 pt-8">{settings.footerCopyright}</p>
          </div>
          <div className="flex items-center gap-10 bg-white/[0.03] p-10 rounded-[4rem] border border-white/5 shadow-3xl">
             <div className="text-right">
                <span className="block text-4xl font-black tracking-tighter">{settings.programmerName}</span>
                <span className="block text-[12px] font-black uppercase tracking-[0.3em] text-white/20 mt-3">{settings.programmerRole}</span>
             </div>
             <div className="w-24 h-24 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-4xl"><img src={settings.programmerImage} className="w-full h-full object-cover" alt="Founder" /></div>
          </div>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}
